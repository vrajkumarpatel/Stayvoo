import os
import uuid
import logging
from datetime import date
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import Booking, Room, Stay, Guest, StayMessage
from routers.bookings import booking_to_dict
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


@router.get("/test-email")
@router.post("/test-email")
async def test_email(_: None = Depends(_verify_admin)):
    """Diagnostic endpoint — sends a test email via SendGrid and returns result."""
    import asyncio
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail

    api_key = os.getenv("SENDGRID_API_KEY")
    from_email = os.getenv("SENDGRID_FROM_EMAIL", "hello@stayvoo.com")

    if not api_key:
        return {"status": "error", "issue": "SENDGRID_API_KEY is not set in Railway environment variables"}

    message = Mail(
        from_email=(from_email, "Stayvoo"),
        to_emails="vp431030@gmail.com",
        subject="Stayvoo Email Test",
        html_content="<p>Test email from Stayvoo — SendGrid is working correctly!</p>",
    )
    try:
        sg = SendGridAPIClient(api_key)
        response = await asyncio.to_thread(sg.send, message)
        logger.info("Test email sent via SendGrid (status %s)", response.status_code)
        return {"status": "sent", "to": "vp431030@gmail.com", "from": from_email, "sendgrid_status": response.status_code}
    except Exception as e:
        logger.error("Test email failed: %s", e)
        return {"status": "error", "issue": str(e)}
