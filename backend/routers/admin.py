import os
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import Booking, Room
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
    await db.commit()

    booking = await _load_booking(booking_id, db)
    booking_dict = booking_to_dict(booking)

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


@router.post("/test-email")
async def test_email(_: None = Depends(_verify_admin)):
    """Diagnostic endpoint — sends a test email and returns SMTP result directly."""
    import aiosmtplib
    from email.mime.text import MIMEText

    smtp_user = os.getenv("GMAIL_USER")
    smtp_pass = os.getenv("GMAIL_APP_PASSWORD")
    smtp_host = os.getenv("SMTP_HOST", "mail.privateemail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    if not smtp_user:
        return {"status": "error", "issue": "GMAIL_USER is not set in Railway environment variables"}
    if not smtp_pass:
        return {"status": "error", "issue": "GMAIL_APP_PASSWORD is not set in Railway environment variables"}

    msg = MIMEText("Test email from Stayvoo — SMTP is working correctly!", "plain")
    msg["Subject"] = "Stayvoo Email Test"
    msg["From"] = f"Stayvoo <{smtp_user}>"
    msg["To"] = "vp431030@gmail.com"

    try:
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_pass,
            start_tls=True,
        )
        logger.info("Test email sent from %s via %s", smtp_user, smtp_host)
        return {"status": "sent", "to": "vp431030@gmail.com", "from": smtp_user, "via": smtp_host}
    except Exception as e:
        logger.error("Test email failed: %s", e)
        return {"status": "error", "issue": str(e), "smtp_user": smtp_user, "smtp_host": smtp_host}
