import os
import uuid
import logging
from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from database import get_db
from models import Booking, Room, Stay, Guest, StayMessage, Reservation, ReservationMessage
from routers.bookings import booking_to_dict
from routers.reservations import reservation_to_dict
from services.notifications import (
    notify_guest_confirmed,
    notify_pre_arrival,
    notify_post_stay,
)
from services.email_service import (
    send_booking_confirmed,
    send_pre_arrival_email,
    send_post_stay_email,
    send_invoice_email,
    send_reservation_confirmed,
    send_reservation_cancelled,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


def _verify_admin(x_admin_password: str = Header(...)):
    expected = os.getenv("ADMIN_PASSWORD", "admin123")
    if x_admin_password != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


async def _load_booking(booking_id: str, db: AsyncSession) -> Booking:
    result = await db.execute(
        select(Booking)
        .where(Booking.id == booking_id)
        .options(
            selectinload(Booking.guest),
            selectinload(Booking.hotel),
            selectinload(Booking.room),
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.get("/bookings")
async def list_bookings(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    result = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.guest),
            selectinload(Booking.hotel),
            selectinload(Booking.room),
        )
        .order_by(Booking.created_at.desc())
    )
    return [booking_to_dict(b) for b in result.scalars().all()]


@router.get("/bookings/{booking_id}")
async def get_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    booking = await _load_booking(booking_id, db)
    return booking_to_dict(booking)


class ConfirmPayload(BaseModel):
    pms_confirmation: str


@router.post("/bookings/{booking_id}/confirm")
async def confirm_booking(
    booking_id: str,
    payload: ConfirmPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    booking = await _load_booking(booking_id, db)
    booking.pms_confirmation = payload.pms_confirmation
    booking.status = "confirmed"

    # Auto-create Stay record if not already exists for this booking
    stay_check = await db.execute(select(Stay).where(Stay.booking_id == booking.id))
    if not stay_check.scalar_one_or_none():
        nights = booking.nights
        total = float(booking.total_amount)
        commission = round(total * 0.10, 2)
        today = date.today()
        stay = Stay(
            id=uuid.uuid4(),
            booking_id=booking.id,
            guest_id=booking.guest_id,
            inquiry_id=None,
            guest_first_name=booking.guest.first_name,
            guest_last_name=booking.guest.last_name,
            guest_email=booking.guest.email,
            guest_phone=booking.guest.phone or "",
            guest_type=booking.guest_type,
            hotel_id=booking.hotel_id,
            hotel_name=booking.hotel.name,
            room_number=booking.room.name,
            checkin_date=booking.checkin_date,
            expected_checkout=booking.checkout_date,
            nights_total=nights,
            rate_per_night=float(booking.room_rate),
            total_amount=total,
            amount_paid=0,
            balance_due=total,
            commission_rate=10.00,
            commission_amount=commission,
            pms_confirmation=payload.pms_confirmation,
            status="upcoming" if booking.checkin_date > today else "active",
        )
        db.add(stay)

    await db.commit()

    booking = await _load_booking(booking_id, db)
    booking_dict = booking_to_dict(booking)
    if booking.guest and booking.guest.access_token:
        booking_dict["portal_url"] = f"https://stayvoo.com/my-stay/{booking.guest.access_token}"

    background_tasks.add_task(notify_guest_confirmed, booking_dict)
    background_tasks.add_task(send_booking_confirmed, booking_dict)

    return booking_dict


@router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    booking = await _load_booking(booking_id, db)
    if booking.status == "cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    # Re-credit availability
    room_result = await db.execute(select(Room).where(Room.id == booking.room_id))
    room = room_result.scalar_one_or_none()
    if room:
        room.available_count += 1

    booking.status = "cancelled"
    await db.commit()

    booking = await _load_booking(booking_id, db)
    return booking_to_dict(booking)


@router.post("/bookings/{booking_id}/send-pre-arrival")
async def send_pre_arrival(
    booking_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    booking = await _load_booking(booking_id, db)
    booking_dict = booking_to_dict(booking)
    background_tasks.add_task(notify_pre_arrival, booking_dict)
    background_tasks.add_task(send_pre_arrival_email, booking_dict)
    return {"sent": True, "booking_ref": booking_dict["booking_ref"]}


@router.post("/bookings/{booking_id}/send-post-stay")
async def send_post_stay(
    booking_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    booking = await _load_booking(booking_id, db)
    booking_dict = booking_to_dict(booking)
    background_tasks.add_task(notify_post_stay, booking_dict)
    background_tasks.add_task(send_post_stay_email, booking_dict)
    background_tasks.add_task(send_invoice_email, booking_dict)
    return {"sent": True, "booking_ref": booking_dict["booking_ref"]}


class StayMsgIn(BaseModel):
    message: str


def _staymsg_dict(m: StayMessage) -> dict:
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


@router.get("/stays/{stay_id}/messages")
async def get_stay_messages(
    stay_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    result = await db.execute(
        select(StayMessage)
        .where(StayMessage.stay_id == stay_id)
        .order_by(StayMessage.created_at.asc())
    )
    return [_staymsg_dict(m) for m in result.scalars().all()]


@router.post("/stays/{stay_id}/messages")
async def post_stay_message(
    stay_id: str,
    payload: StayMsgIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    stay_result = await db.execute(select(Stay).where(Stay.id == stay_id))
    stay = stay_result.scalar_one_or_none()
    if not stay:
        raise HTTPException(status_code=404, detail="Stay not found")

    msg = StayMessage(
        id=uuid.uuid4(),
        stay_id=uuid.UUID(stay_id),
        guest_id=stay.guest_id,
        sender="admin",
        sender_name="Stayvoo Team",
        message=payload.message,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    if stay.guest_id:
        g_result = await db.execute(select(Guest).where(Guest.id == stay.guest_id))
        guest = g_result.scalar_one_or_none()
        if guest and guest.access_token:
            from services.email_service import send_stay_message_to_guest
            portal_url = f"https://stayvoo.com/my-stay/{guest.access_token}"
            background_tasks.add_task(
                send_stay_message_to_guest,
                guest.email,
                guest.first_name,
                payload.message,
                stay.hotel_name,
                portal_url,
            )

    return _staymsg_dict(msg)


@router.get("/bookings/{booking_id}/messages")
async def get_booking_messages(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    stay_r = await db.execute(select(Stay).where(Stay.booking_id == uuid.UUID(booking_id)))
    linked_stay = stay_r.scalar_one_or_none()
    if linked_stay:
        filt = or_(StayMessage.booking_id == uuid.UUID(booking_id), StayMessage.stay_id == linked_stay.id)
    else:
        filt = StayMessage.booking_id == uuid.UUID(booking_id)
    result = await db.execute(
        select(StayMessage).where(filt).order_by(StayMessage.created_at.asc())
    )
    return [_staymsg_dict(m) for m in result.scalars().all()]


@router.post("/bookings/{booking_id}/messages")
async def post_booking_message(
    booking_id: str,
    payload: StayMsgIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    booking = await _load_booking(booking_id, db)

    stay_r = await db.execute(select(Stay).where(Stay.booking_id == uuid.UUID(booking_id)))
    linked_stay = stay_r.scalar_one_or_none()

    msg = StayMessage(
        id=uuid.uuid4(),
        booking_id=uuid.UUID(booking_id),
        stay_id=linked_stay.id if linked_stay else None,
        guest_id=booking.guest_id,
        sender="admin",
        sender_name="Stayvoo Team",
        message=payload.message,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    if booking.guest and booking.guest.access_token:
        from services.email_service import send_stay_message_to_guest
        portal_url = f"https://stayvoo.com/my-stay/{booking.guest.access_token}"
        hotel_name = booking.hotel.name if booking.hotel else "Stayvoo"
        background_tasks.add_task(
            send_stay_message_to_guest,
            booking.guest.email,
            booking.guest.first_name,
            payload.message,
            hotel_name,
            portal_url,
        )

    return _staymsg_dict(msg)


class UpdateBookingPayload(BaseModel):
    checkin_date: Optional[str] = None
    checkout_date: Optional[str] = None
    rate_per_night: Optional[float] = None
    special_requests: Optional[str] = None
    guest_phone: Optional[str] = None
    guest_email: Optional[str] = None


@router.put("/bookings/{booking_id}")
async def update_booking(
    booking_id: str,
    payload: UpdateBookingPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    booking = await _load_booking(booking_id, db)

    if payload.checkin_date:
        booking.checkin_date = date.fromisoformat(payload.checkin_date)
    if payload.checkout_date:
        booking.checkout_date = date.fromisoformat(payload.checkout_date)
    if payload.rate_per_night is not None:
        booking.room_rate = payload.rate_per_night

    # Recalculate nights + total whenever dates or rate change
    if payload.checkin_date or payload.checkout_date or payload.rate_per_night is not None:
        nights = (booking.checkout_date - booking.checkin_date).days
        booking.nights = max(nights, 1)
        booking.total_amount = round(float(booking.room_rate) * booking.nights, 2)
        booking.commission_amount = round(float(booking.total_amount) * 0.15, 2)

    if payload.special_requests is not None:
        booking.special_requests = payload.special_requests or None
    if payload.guest_phone and booking.guest:
        booking.guest.phone = payload.guest_phone
    if payload.guest_email and booking.guest:
        booking.guest.email = payload.guest_email.strip().lower()

    booking.last_modified_at = datetime.utcnow()
    booking.last_modified_by = "admin"
    await db.commit()

    booking = await _load_booking(booking_id, db)
    booking_dict = booking_to_dict(booking)
    if booking.guest and booking.guest.access_token:
        booking_dict["portal_url"] = f"https://stayvoo.com/my-stay/{booking.guest.access_token}"

    # Notify guest of changes
    if booking.guest and booking.guest.email and booking.guest.access_token:
        from services.email_service import send_stay_message_to_guest
        msg = (
            f"Your reservation ({booking.booking_ref}) has been updated by our team.\n"
            f"New dates: {booking.checkin_date} → {booking.checkout_date} ({booking.nights} nights)\n"
            f"Rate: ${float(booking.room_rate):.0f}/night · Total: ${float(booking.total_amount):.0f}\n\n"
            "View your full reservation details in your guest portal."
        )
        portal_url = f"https://stayvoo.com/my-stay/{booking.guest.access_token}"
        background_tasks.add_task(
            send_stay_message_to_guest,
            booking.guest.email,
            booking.guest.first_name,
            msg,
            booking.hotel.name if booking.hotel else "Stayvoo",
            portal_url,
        )

    return booking_dict


# ─── Reservations ────────────────────────────────────────────────────────────

async def _load_reservation(reservation_id: str, db: AsyncSession) -> Reservation:
    result = await db.execute(
        select(Reservation)
        .where(Reservation.id == reservation_id)
        .options(selectinload(Reservation.guest))
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return r


def _res_dict_with_portal(r: Reservation) -> dict:
    d = reservation_to_dict(r)
    if r.guest and r.guest.access_token:
        d["portal_url"] = f"https://stayvoo.com/my-stay/{r.guest.access_token}"
    return d


@router.get("/reservations")
async def list_reservations(
    date_str: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    """
    No params (or date_str only): return grouped view for that date.
    search or status: return flat list.
    """
    if search or status:
        q = select(Reservation).options(selectinload(Reservation.guest)).order_by(Reservation.created_at.desc())
        if status:
            q = q.where(Reservation.status == status)
        result = await db.execute(q)
        all_res = result.scalars().all()
        data = [reservation_to_dict(r) for r in all_res]
        if search:
            s = search.lower()
            data = [
                r for r in data
                if s in (r.get("guest_first_name") or "").lower()
                or s in (r.get("guest_last_name") or "").lower()
                or s in (r.get("guest_email") or "").lower()
                or s in (r.get("reservation_ref") or "").lower()
                or s in (r.get("hotel_name_snapshot") or "").lower()
            ]
        return {"mode": "flat", "reservations": data}

    nav_date = date.today()
    if date_str:
        try:
            nav_date = date.fromisoformat(date_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")

    result = await db.execute(
        select(Reservation)
        .options(selectinload(Reservation.guest))
        .order_by(Reservation.created_at.desc())
    )
    all_res = result.scalars().all()

    new_requests = [reservation_to_dict(r) for r in all_res if r.status == "pending"]
    arrivals = [reservation_to_dict(r) for r in all_res
                if r.checkin_date == nav_date and r.status in ("pending", "confirmed")]
    departures = [reservation_to_dict(r) for r in all_res
                  if r.checkout_date == nav_date and r.status == "checked_in"]
    in_house = [reservation_to_dict(r) for r in all_res
                if r.checkin_date <= nav_date and r.checkout_date > nav_date and r.status == "checked_in"]

    return {
        "mode": "grouped",
        "date": nav_date.isoformat(),
        "new_requests": new_requests,
        "arrivals": arrivals,
        "departures": departures,
        "in_house": in_house,
    }


class ResConfirmPayload(BaseModel):
    pms_confirmation: str


@router.put("/reservations/{reservation_id}/confirm")
async def confirm_reservation(
    reservation_id: str,
    payload: ResConfirmPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    r = await _load_reservation(reservation_id, db)
    r.pms_confirmation = payload.pms_confirmation
    r.status = "confirmed"
    r.confirmed_at = datetime.utcnow()
    await db.commit()

    r = await _load_reservation(reservation_id, db)
    res_dict = _res_dict_with_portal(r)
    background_tasks.add_task(notify_guest_confirmed, {
        "booking_ref": r.reservation_ref,
        "guest": res_dict.get("guest"),
    })
    background_tasks.add_task(send_reservation_confirmed, res_dict)
    return res_dict


@router.put("/reservations/{reservation_id}/cancel")
async def cancel_reservation(
    reservation_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    r = await _load_reservation(reservation_id, db)
    if r.status == "cancelled":
        raise HTTPException(status_code=400, detail="Already cancelled")
    if r.status == "checked_out":
        raise HTTPException(status_code=400, detail="Cannot cancel a checked-out reservation")

    # Re-credit room availability
    if r.room_source_id:
        room_result = await db.execute(select(Room).where(Room.id == r.room_source_id))
        room = room_result.scalar_one_or_none()
        if room:
            room.available_count += 1

    r.status = "cancelled"
    r.cancelled_at = datetime.utcnow()
    await db.commit()

    r = await _load_reservation(reservation_id, db)
    res_dict = _res_dict_with_portal(r)
    background_tasks.add_task(send_reservation_cancelled, res_dict)
    return res_dict


class UpdateResPayload(BaseModel):
    checkin_date: Optional[str] = None
    checkout_date: Optional[str] = None
    rate_per_night: Optional[float] = None
    special_requests: Optional[str] = None
    guest_phone: Optional[str] = None
    guest_email: Optional[str] = None


@router.put("/reservations/{reservation_id}")
async def update_reservation(
    reservation_id: str,
    payload: UpdateResPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    from decimal import Decimal
    r = await _load_reservation(reservation_id, db)

    if payload.checkin_date:
        r.checkin_date = date.fromisoformat(payload.checkin_date)
    if payload.checkout_date:
        r.checkout_date = date.fromisoformat(payload.checkout_date)
    if payload.rate_per_night is not None:
        r.rate_per_night = Decimal(str(payload.rate_per_night))

    if payload.checkin_date or payload.checkout_date or payload.rate_per_night is not None:
        nights = (r.checkout_date - r.checkin_date).days
        r.nights = max(nights, 1)
        total = Decimal(str(r.rate_per_night)) * r.nights
        r.total_amount = total
        r.balance_due = total - (r.amount_paid or Decimal("0"))
        r.commission_amount = (total * r.commission_rate / Decimal("100")).quantize(Decimal("0.01"))

    if payload.special_requests is not None:
        r.special_requests = payload.special_requests or None
    if payload.guest_phone:
        r.guest_phone = payload.guest_phone
        if r.guest:
            r.guest.phone = payload.guest_phone
    if payload.guest_email:
        r.guest_email = payload.guest_email.strip().lower()
        if r.guest:
            r.guest.email = payload.guest_email.strip().lower()

    r.last_modified_at = datetime.utcnow()
    r.last_modified_by = "admin"
    await db.commit()

    r = await _load_reservation(reservation_id, db)
    res_dict = _res_dict_with_portal(r)
    if r.guest and r.guest.email and r.guest.access_token:
        from services.email_service import send_stay_message_to_guest
        msg = (
            f"Your reservation ({r.reservation_ref}) has been updated by our team.\n"
            f"New dates: {r.checkin_date} → {r.checkout_date} ({r.nights} nights)\n"
            f"Rate: ${float(r.rate_per_night):.0f}/night · Total: ${float(r.total_amount):.0f}\n\n"
            "View your full reservation details in your guest portal."
        )
        portal_url = f"https://stayvoo.com/my-stay/{r.guest.access_token}"
        background_tasks.add_task(
            send_stay_message_to_guest,
            r.guest.email,
            r.guest.first_name,
            msg,
            r.hotel_name_snapshot,
            portal_url,
        )
    return res_dict


@router.post("/reservations/{reservation_id}/checkin")
async def checkin_reservation(
    reservation_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    r = await _load_reservation(reservation_id, db)
    if r.status != "confirmed":
        raise HTTPException(status_code=400, detail="Only confirmed reservations can be checked in")
    r.status = "checked_in"
    await db.commit()
    r = await _load_reservation(reservation_id, db)
    return _res_dict_with_portal(r)


@router.post("/reservations/{reservation_id}/checkout")
async def checkout_reservation(
    reservation_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    r = await _load_reservation(reservation_id, db)
    if r.status != "checked_in":
        raise HTTPException(status_code=400, detail="Only checked-in reservations can be checked out")
    r.status = "checked_out"
    r.checked_out_at = datetime.utcnow()
    await db.commit()
    r = await _load_reservation(reservation_id, db)
    return _res_dict_with_portal(r)


class ResMsgIn(BaseModel):
    message: str


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


@router.get("/reservations/{reservation_id}/messages")
async def get_reservation_messages(
    reservation_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    result = await db.execute(
        select(ReservationMessage)
        .where(ReservationMessage.reservation_id == uuid.UUID(reservation_id))
        .order_by(ReservationMessage.created_at.asc())
    )
    return [_resmsg_dict(m) for m in result.scalars().all()]


@router.post("/reservations/{reservation_id}/messages")
async def post_reservation_message(
    reservation_id: str,
    payload: ResMsgIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    r = await _load_reservation(reservation_id, db)

    msg = ReservationMessage(
        id=uuid.uuid4(),
        reservation_id=uuid.UUID(reservation_id),
        sender="admin",
        sender_name="Stayvoo Team",
        message=payload.message,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    if r.guest and r.guest.access_token:
        from services.email_service import send_stay_message_to_guest
        portal_url = f"https://stayvoo.com/my-stay/{r.guest.access_token}"
        background_tasks.add_task(
            send_stay_message_to_guest,
            r.guest_email,
            r.guest_first_name,
            payload.message,
            r.hotel_name_snapshot,
            portal_url,
        )
    return _resmsg_dict(msg)


@router.get("/billing/reservations/{month}")
async def billing_reservations(
    month: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    """Billing summary using the reservations table (preferred over the stays-based endpoint)."""
    from sqlalchemy import extract
    try:
        year, month_num = (int(x) for x in month.split("-"))
    except Exception:
        raise HTTPException(status_code=400, detail="Month must be YYYY-MM format")

    result = await db.execute(
        select(Reservation)
        .where(
            extract("year", Reservation.checkin_date) == year,
            extract("month", Reservation.checkin_date) == month_num,
            Reservation.status != "cancelled",
        )
        .order_by(Reservation.hotel_name_snapshot, Reservation.checkin_date)
    )
    res_list = result.scalars().all()

    by_source: dict = {}
    for r in res_list:
        key = r.hotel_name_snapshot
        if key not in by_source:
            by_source[key] = {"hotel_name": key, "hotel_source": r.hotel_source, "reservations": []}
        by_source[key]["reservations"].append(reservation_to_dict(r))

    summary = []
    for data in by_source.values():
        rl = data["reservations"]
        revenue = sum(float(r["total_amount"]) for r in rl)
        commission = sum(float(r["commission_amount"]) for r in rl)
        comm_paid = sum(float(r["commission_amount"]) for r in rl if r.get("commission_paid"))
        summary.append({
            "hotel_name": data["hotel_name"],
            "hotel_source": data["hotel_source"],
            "total_reservations": len(rl),
            "active_reservations": sum(1 for r in rl if r["status"] in ("pending", "confirmed", "checked_in")),
            "completed_reservations": sum(1 for r in rl if r["status"] == "checked_out"),
            "total_revenue": revenue,
            "total_commission": commission,
            "commission_paid": comm_paid,
            "commission_pending": commission - comm_paid,
            "reservations": rl,
        })

    total_revenue = sum(h["total_revenue"] for h in summary)
    total_commission = sum(h["total_commission"] for h in summary)
    comm_paid_total = sum(h["commission_paid"] for h in summary)

    return {
        "month": month,
        "total_reservations": len(res_list),
        "total_revenue": total_revenue,
        "total_commission": total_commission,
        "commission_paid": comm_paid_total,
        "commission_pending": total_commission - comm_paid_total,
        "by_hotel": summary,
    }


@router.get("/test-email")
@router.post("/test-email")
async def test_email(_: None = Depends(_verify_admin)):
    """Diagnostic endpoint — sends a test email via the shared, allowlist-gated send path."""
    from services.email_service import _send_tracked

    if not os.getenv("SENDGRID_API_KEY"):
        return {"status": "error", "issue": "SENDGRID_API_KEY is not set in Railway environment variables"}

    result = await _send_tracked(
        "vp431030@gmail.com",
        "Stayvoo Email Test",
        "<p>Test email from Stayvoo, SendGrid is working correctly!</p>",
    )
    if result["success"]:
        return {"status": "sent", "to": "vp431030@gmail.com", "sendgrid_message_id": result["message_id"]}
    return {"status": "error", "issue": result["error"]}
