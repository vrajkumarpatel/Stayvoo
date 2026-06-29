import os
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import Booking
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
