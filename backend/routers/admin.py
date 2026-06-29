import os
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import Booking
from routers.bookings import booking_to_dict

router = APIRouter(prefix="/admin", tags=["admin"])


def _verify_admin(x_admin_password: str = Header(...)):
    expected = os.getenv("ADMIN_PASSWORD", "admin123")
    if x_admin_password != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


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
    bookings = result.scalars().all()
    return [booking_to_dict(b) for b in bookings]


class ConfirmPayload(BaseModel):
    pms_confirmation: str


@router.post("/bookings/{booking_id}/confirm")
async def confirm_booking(
    booking_id: str,
    payload: ConfirmPayload,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
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

    booking.pms_confirmation = payload.pms_confirmation
    booking.status = "confirmed"
    await db.commit()
    await db.refresh(booking)
    return booking_to_dict(booking)
