import os
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import Hotel, Room, CommissionRate, Guest, Reservation, Booking, Inquiry
from routers.hotels import hotel_to_dict
from routers.reservations import reservation_to_dict
from routers.bookings import booking_to_dict
from routers.inquiries import inquiry_to_dict
from services.audit import record_change

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["directory"])


def _verify_admin(x_admin_password: str = Header(...)):
    expected = os.getenv("ADMIN_PASSWORD", "admin123")
    if x_admin_password != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ─── Hotels ──────────────────────────────────────────────────────────────────

@router.get("/hotels")
async def list_admin_hotels(db: AsyncSession = Depends(get_db), _: None = Depends(_verify_admin)):
    result = await db.execute(select(Hotel).options(selectinload(Hotel.rooms)).order_by(Hotel.name))
    return [hotel_to_dict(h) for h in result.scalars().all()]


class HotelUpdate(BaseModel):
    description: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    amenities: Optional[list[str]] = None
    photo_urls: Optional[list[str]] = None
    active: Optional[bool] = None


@router.put("/hotels/{hotel_id}")
async def update_admin_hotel(
    hotel_id: str, payload: HotelUpdate,
    db: AsyncSession = Depends(get_db), _: None = Depends(_verify_admin),
):
    result = await db.execute(select(Hotel).options(selectinload(Hotel.rooms)).where(Hotel.id == hotel_id))
    hotel = result.scalar_one_or_none()
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")

    update_data = payload.model_dump(exclude_unset=True)
    before = {k: getattr(hotel, k) for k in update_data}
    for k, v in update_data.items():
        setattr(hotel, k, v)

    await record_change(db, "hotel", hotel.id, {k: (before[k], getattr(hotel, k)) for k in update_data})
    await db.commit()
    await db.refresh(hotel)
    result = await db.execute(select(Hotel).options(selectinload(Hotel.rooms)).where(Hotel.id == hotel_id))
    return hotel_to_dict(result.scalar_one())


# ─── Commission Rates ────────────────────────────────────────────────────────

def commission_rate_to_dict(cr: CommissionRate) -> dict:
    return {
        "id": str(cr.id), "hotel_source": cr.hotel_source, "default_rate": float(cr.default_rate),
        "notes": cr.notes, "updated_at": cr.updated_at.isoformat() if cr.updated_at else None,
    }


@router.get("/commission-rates")
async def list_commission_rates(db: AsyncSession = Depends(get_db), _: None = Depends(_verify_admin)):
    result = await db.execute(select(CommissionRate).order_by(CommissionRate.hotel_source))
    return [commission_rate_to_dict(cr) for cr in result.scalars().all()]


class CommissionRateUpdate(BaseModel):
    default_rate: Optional[float] = None
    notes: Optional[str] = None


@router.put("/commission-rates/{hotel_source}")
async def update_commission_rate(
    hotel_source: str, payload: CommissionRateUpdate,
    db: AsyncSession = Depends(get_db), _: None = Depends(_verify_admin),
):
    result = await db.execute(select(CommissionRate).where(CommissionRate.hotel_source == hotel_source))
    cr = result.scalar_one_or_none()
    if not cr:
        raise HTTPException(status_code=404, detail="Commission rate not found for this hotel_source")

    before = {"default_rate": float(cr.default_rate), "notes": cr.notes}
    if payload.default_rate is not None:
        cr.default_rate = payload.default_rate
    if payload.notes is not None:
        cr.notes = payload.notes

    await record_change(db, "commission_rate", cr.id, {
        "default_rate": (before["default_rate"], float(cr.default_rate)),
        "notes": (before["notes"], cr.notes),
    })
    await db.commit()
    await db.refresh(cr)
    return commission_rate_to_dict(cr)


# ─── Guests ──────────────────────────────────────────────────────────────────

def guest_to_dict(g: Guest) -> dict:
    return {
        "id": str(g.id), "first_name": g.first_name, "last_name": g.last_name, "email": g.email,
        "phone": g.phone, "guest_type": g.guest_type, "company": g.company, "total_stays": g.total_stays,
        "notes": g.notes, "created_at": g.created_at.isoformat() if g.created_at else None,
    }


@router.get("/guests")
async def list_guests(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db), _: None = Depends(_verify_admin),
):
    q = select(Guest).order_by(Guest.created_at.desc())
    result = await db.execute(q)
    guests = result.scalars().all()
    data = [guest_to_dict(g) for g in guests]
    if search:
        s = search.lower()
        data = [
            g for g in data
            if s in g["first_name"].lower() or s in g["last_name"].lower()
            or s in g["email"].lower() or s in (g["phone"] or "").lower()
        ]
    return data


@router.get("/guests/{guest_id}")
async def get_guest_360(
    guest_id: str,
    db: AsyncSession = Depends(get_db), _: None = Depends(_verify_admin),
):
    result = await db.execute(select(Guest).where(Guest.id == guest_id))
    guest = result.scalar_one_or_none()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    res_result = await db.execute(
        select(Reservation).options(selectinload(Reservation.guest))
        .where(Reservation.guest_id == guest_id).order_by(Reservation.created_at.desc())
    )
    bk_result = await db.execute(
        select(Booking).options(selectinload(Booking.guest), selectinload(Booking.hotel), selectinload(Booking.room))
        .where(Booking.guest_id == guest_id).order_by(Booking.created_at.desc())
    )
    inq_result = await db.execute(
        select(Inquiry).where(Inquiry.guest_id == guest_id).order_by(Inquiry.created_at.desc())
    )

    return {
        "guest": guest_to_dict(guest),
        "reservations": [reservation_to_dict(r) for r in res_result.scalars().all()],
        "bookings": [booking_to_dict(b) for b in bk_result.scalars().all()],
        "inquiries": [inquiry_to_dict(i) for i in inq_result.scalars().all()],
    }


class GuestUpdate(BaseModel):
    guest_type: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None


@router.put("/guests/{guest_id}")
async def update_guest(
    guest_id: str, payload: GuestUpdate,
    db: AsyncSession = Depends(get_db), _: None = Depends(_verify_admin),
):
    result = await db.execute(select(Guest).where(Guest.id == guest_id))
    guest = result.scalar_one_or_none()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    update_data = payload.model_dump(exclude_unset=True)
    before = {k: getattr(guest, k) for k in update_data}
    for k, v in update_data.items():
        setattr(guest, k, v)

    await record_change(db, "guest", guest.id, {k: (before[k], getattr(guest, k)) for k in update_data})
    await db.commit()
    await db.refresh(guest)
    return guest_to_dict(guest)
