import uuid as _uuid
import logging
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from database import get_db
from models import Guest, Booking, Stay, Inquiry, StayMessage, Reservation, ReservationMessage
from services.guests import issue_new_token, extend_token

logger = logging.getLogger(__name__)
router = APIRouter(tags=["guests"])

PORTAL_BASE = "https://stayvoo.com/my-stay"


def _portal_url(token: str) -> str:
    return f"{PORTAL_BASE}/{token}"


def _validate_token(guest: Guest | None) -> None:
    if not guest:
        raise HTTPException(status_code=401, detail="Invalid or expired link")
    if not guest.token_expires_at or guest.token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="This link has expired. Request a new one at stayvoo.com/my-reservations")


class LoginIn(BaseModel):
    email: str


class MsgPayload(BaseModel):
    message: str


@router.post("/guests/login")
async def guest_login(
    payload: LoginIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Guest).where(Guest.email == payload.email.strip().lower()))
    guest = result.scalar_one_or_none()
    if guest:
        token = issue_new_token(guest)
        await db.commit()
        portal_url = _portal_url(token)
        from services.email_service import send_guest_login_email
        background_tasks.add_task(
            send_guest_login_email,
            {"first_name": guest.first_name, "email": guest.email},
            portal_url,
        )
    return {"sent": True}


@router.get("/guests/check")
async def check_guest(email: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Guest).where(Guest.email == email.strip().lower()))
    guest = result.scalar_one_or_none()
    if not guest:
        return {"exists": False}
    return {
        "exists": True,
        "first_name": guest.first_name,
        "last_name": guest.last_name,
        "phone": guest.phone or "",
    }


@router.get("/my-stay/{token}")
async def get_my_stay(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Guest).where(Guest.access_token == token))
    guest = result.scalar_one_or_none()
    _validate_token(guest)

    extend_token(guest)
    await db.commit()

    res_result = await db.execute(
        select(Reservation)
        .where(Reservation.guest_id == guest.id)
        .order_by(Reservation.created_at.desc())
    )
    reservations = res_result.scalars().all()

    inquiries_result = await db.execute(
        select(Inquiry)
        .where(Inquiry.guest_id == guest.id)
        .order_by(Inquiry.created_at.desc())
    )
    inquiries = inquiries_result.scalars().all()

    total_nights = sum(r.nights for r in reservations if r.status in ("confirmed", "checked_in", "checked_out"))

    return {
        "token": token,
        "guest": {
            "id": str(guest.id),
            "first_name": guest.first_name,
            "last_name": guest.last_name,
            "email": guest.email,
            "phone": guest.phone,
            "total_stays": guest.total_stays,
            "member_since": guest.created_at.strftime("%B %Y") if guest.created_at else "-",
        },
        "reservations": [_reservation_mini(r) for r in reservations],
        "inquiries": [_inquiry_mini(i) for i in inquiries],
        "stats": {
            "total_reservations": len(reservations),
            "total_nights": total_nights,
            "total_inquiries": len(inquiries),
        },
    }


@router.post("/my-stay/{token}/refresh")
async def refresh_token(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Guest).where(Guest.access_token == token))
    guest = result.scalar_one_or_none()
    _validate_token(guest)
    new_token = issue_new_token(guest)
    await db.commit()
    return {"token": new_token}


@router.get("/my-stay/{token}/messages/{record_type}/{record_id}")
async def get_my_stay_messages(
    token: str,
    record_type: str,
    record_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Guest).where(Guest.access_token == token))
    guest = result.scalar_one_or_none()
    _validate_token(guest)

    # For bookings, also fetch messages saved under the linked stay (admin replies go there)
    if record_type == "booking":
        stay_r = await db.execute(select(Stay).where(Stay.booking_id == _uuid.UUID(record_id)))
        linked_stay = stay_r.scalar_one_or_none()
        if linked_stay:
            filt = or_(StayMessage.booking_id == record_id, StayMessage.stay_id == linked_stay.id)
        else:
            filt = StayMessage.booking_id == record_id
    else:
        filt = _record_filter(record_type, record_id)

    msgs_result = await db.execute(
        select(StayMessage)
        .where(filt)
        .order_by(StayMessage.created_at.asc())
    )
    msgs = msgs_result.scalars().all()

    await db.execute(
        StayMessage.__table__.update()
        .where(filt, StayMessage.sender == "admin")
        .values(is_read=True)
    )
    await db.commit()

    return [_msg_dict(m) for m in msgs]


@router.post("/my-stay/{token}/messages/{record_type}/{record_id}")
async def send_my_stay_message(
    token: str,
    record_type: str,
    record_id: str,
    payload: MsgPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Guest).where(Guest.access_token == token))
    guest = result.scalar_one_or_none()
    _validate_token(guest)

    kwargs: dict = {
        "id": _uuid.uuid4(),
        "guest_id": guest.id,
        "sender": "guest",
        "sender_name": f"{guest.first_name} {guest.last_name}",
        "message": payload.message,
    }
    if record_type == "booking":
        kwargs["booking_id"] = _uuid.UUID(record_id)
        # Also link to stay so admin sees it in stays view
        stay_r = await db.execute(select(Stay).where(Stay.booking_id == _uuid.UUID(record_id)))
        linked_stay = stay_r.scalar_one_or_none()
        if linked_stay:
            kwargs["stay_id"] = linked_stay.id
    elif record_type == "stay":
        kwargs["stay_id"] = _uuid.UUID(record_id)
    elif record_type == "inquiry":
        kwargs["inquiry_id"] = _uuid.UUID(record_id)

    msg = StayMessage(**kwargs)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    from services.email_service import send_guest_message_alert
    background_tasks.add_task(
        send_guest_message_alert,
        f"{guest.first_name} {guest.last_name}",
        guest.email,
        payload.message,
        record_type,
        record_id,
    )
    return _msg_dict(msg)


@router.get("/my-stay/{token}/reservations/{reservation_id}/messages")
async def get_reservation_messages(
    token: str,
    reservation_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Guest).where(Guest.access_token == token))
    guest = result.scalar_one_or_none()
    _validate_token(guest)

    msgs_result = await db.execute(
        select(ReservationMessage)
        .where(ReservationMessage.reservation_id == _uuid.UUID(reservation_id))
        .order_by(ReservationMessage.created_at.asc())
    )
    msgs = msgs_result.scalars().all()

    await db.execute(
        ReservationMessage.__table__.update()
        .where(
            ReservationMessage.reservation_id == _uuid.UUID(reservation_id),
            ReservationMessage.sender == "admin",
        )
        .values(is_read=True)
    )
    await db.commit()

    return [_resmsg_dict(m) for m in msgs]


@router.post("/my-stay/{token}/reservations/{reservation_id}/messages")
async def send_reservation_message(
    token: str,
    reservation_id: str,
    payload: MsgPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Guest).where(Guest.access_token == token))
    guest = result.scalar_one_or_none()
    _validate_token(guest)

    res_result = await db.execute(
        select(Reservation).where(Reservation.id == _uuid.UUID(reservation_id))
    )
    reservation = res_result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    msg = ReservationMessage(
        id=_uuid.uuid4(),
        reservation_id=_uuid.UUID(reservation_id),
        sender="guest",
        sender_name=f"{guest.first_name} {guest.last_name}",
        message=payload.message,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    from services.email_service import send_guest_message_alert
    background_tasks.add_task(
        send_guest_message_alert,
        f"{guest.first_name} {guest.last_name}",
        guest.email,
        payload.message,
        "reservation",
        reservation_id,
    )
    return _resmsg_dict(msg)


def _resmsg_dict(m: ReservationMessage) -> dict:
    return {
        "id": str(m.id),
        "reservation_id": str(m.reservation_id),
        "sender": m.sender,
        "sender_name": m.sender_name,
        "message": m.message,
        "is_read": m.is_read,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _record_filter(record_type: str, record_id: str):
    if record_type == "booking":
        return StayMessage.booking_id == record_id
    if record_type == "stay":
        return StayMessage.stay_id == record_id
    return StayMessage.inquiry_id == record_id


def _msg_dict(m: StayMessage) -> dict:
    return {
        "id": str(m.id),
        "stay_id": str(m.stay_id) if m.stay_id else None,
        "booking_id": str(m.booking_id) if m.booking_id else None,
        "inquiry_id": str(m.inquiry_id) if m.inquiry_id else None,
        "guest_id": str(m.guest_id) if m.guest_id else None,
        "sender": m.sender,
        "sender_name": m.sender_name,
        "message": m.message,
        "is_read": m.is_read,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _reservation_mini(r: Reservation) -> dict:
    return {
        "id": str(r.id),
        "reservation_ref": r.reservation_ref,
        "status": r.status,
        "hotel_source": r.hotel_source,
        "hotel_name_snapshot": r.hotel_name_snapshot,
        "room_type_snapshot": r.room_type_snapshot,
        "checkin_date": r.checkin_date.isoformat() if r.checkin_date else None,
        "checkout_date": r.checkout_date.isoformat() if r.checkout_date else None,
        "nights": r.nights,
        "rate_per_night": float(r.rate_per_night),
        "total_amount": float(r.total_amount),
        "pms_confirmation": r.pms_confirmation,
        "card_last4": r.card_last4,
        "card_brand": r.card_brand,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def _booking_mini(b: Booking) -> dict:
    return {
        "id": str(b.id),
        "booking_ref": b.booking_ref,
        "status": b.status,
        "checkin_date": b.checkin_date.isoformat() if b.checkin_date else None,
        "checkout_date": b.checkout_date.isoformat() if b.checkout_date else None,
        "nights": b.nights,
        "total_amount": float(b.total_amount),
        "room_rate": float(b.room_rate),
        "pms_confirmation": b.pms_confirmation,
        "hotel_name": b.hotel.name if b.hotel else "-",
        "hotel_id": str(b.hotel_id) if b.hotel_id else None,
        "room_name": b.room.name if b.room else "-",
        "card_last4": b.card_last4,
        "card_brand": b.card_brand,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


def _stay_mini(s: Stay) -> dict:
    return {
        "id": str(s.id),
        "status": s.status,
        "hotel_name": s.hotel_name,
        "checkin_date": str(s.checkin_date),
        "expected_checkout": str(s.expected_checkout),
        "nights_total": s.nights_total,
        "rate_per_night": float(s.rate_per_night),
        "total_amount": float(s.total_amount),
        "amount_paid": float(s.amount_paid),
        "balance_due": float(s.balance_due),
        "pms_confirmation": s.pms_confirmation,
        "booking_id": str(s.booking_id) if s.booking_id else None,
    }


def _inquiry_mini(i: Inquiry) -> dict:
    return {
        "id": str(i.id),
        "status": i.status,
        "num_rooms": i.num_rooms,
        "length_of_stay": i.length_of_stay,
        "start_date": str(i.start_date),
        "guest_type": i.guest_type,
        "hotel_preference": i.hotel_preference,
        "created_at": i.created_at.isoformat() if i.created_at else None,
    }
