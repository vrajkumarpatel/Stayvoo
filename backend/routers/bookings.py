import os
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from database import get_db
from models import Hotel, Room, Guest, Booking
from services.notifications import notify_new_booking, notify_guest_received

router = APIRouter(prefix="/bookings", tags=["bookings"])

COMMISSION_RATE = Decimal("0.15")

BRAND_CODES = {
    "wyndham": "WYN",
    "choice": "CHO",
}


class GuestIn(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    guest_type: str = "leisure"
    company: str | None = None
    notes: str | None = None


class BookingIn(BaseModel):
    hotel_id: str
    room_id: str
    guest: GuestIn
    checkin_date: date
    checkout_date: date
    special_requests: str | None = None
    estimated_arrival: str | None = None
    source: str = "website"


def booking_to_dict(b: Booking) -> dict:
    return {
        "id": str(b.id),
        "booking_ref": b.booking_ref,
        "hotel_id": str(b.hotel_id),
        "room_id": str(b.room_id),
        "guest_id": str(b.guest_id),
        "tier": b.tier,
        "checkin_date": b.checkin_date.isoformat(),
        "checkout_date": b.checkout_date.isoformat(),
        "nights": b.nights,
        "room_rate": float(b.room_rate),
        "total_amount": float(b.total_amount),
        "commission_amount": float(b.commission_amount),
        "special_requests": b.special_requests,
        "estimated_arrival": b.estimated_arrival,
        "pms_confirmation": b.pms_confirmation,
        "status": b.status,
        "guest_type": b.guest_type,
        "source": b.source,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "guest": {
            "id": str(b.guest.id),
            "first_name": b.guest.first_name,
            "last_name": b.guest.last_name,
            "email": b.guest.email,
            "phone": b.guest.phone,
            "guest_type": b.guest.guest_type,
            "company": b.guest.company,
            "total_stays": b.guest.total_stays,
        } if b.guest else None,
        "hotel": {
            "id": str(b.hotel.id),
            "name": b.hotel.name,
            "brand": b.hotel.brand,
            "address": b.hotel.address,
        } if b.hotel else None,
        "room": {
            "id": str(b.room.id),
            "name": b.room.name,
            "price_per_night": float(b.room.price_per_night),
        } if b.room else None,
    }


async def _generate_booking_ref(db: AsyncSession, hotel: Hotel) -> str:
    brand_code = BRAND_CODES.get(hotel.brand.lower(), hotel.brand[:3].upper())

    # Determine hotel number within brand
    result = await db.execute(
        select(Hotel)
        .where(Hotel.brand == hotel.brand, Hotel.active == True)
        .order_by(Hotel.created_at)
    )
    brand_hotels = result.scalars().all()
    hotel_ids = [str(h.id) for h in brand_hotels]
    hotel_num = hotel_ids.index(str(hotel.id)) + 1

    # Total bookings so far
    count_result = await db.execute(select(func.count()).select_from(Booking))
    total = count_result.scalar() or 0

    return f"SD-{brand_code}{hotel_num}-{total + 1:04d}"


@router.post("")
async def create_booking(
    payload: BookingIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    # Validate hotel
    hotel_result = await db.execute(
        select(Hotel).where(Hotel.id == payload.hotel_id, Hotel.active == True)
    )
    hotel = hotel_result.scalar_one_or_none()
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")

    # Validate room and availability
    room_result = await db.execute(
        select(Room).where(Room.id == payload.room_id, Room.hotel_id == payload.hotel_id)
    )
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found for this hotel")
    if room.available_count < 1:
        raise HTTPException(status_code=409, detail="Room not available")

    if payload.checkout_date <= payload.checkin_date:
        raise HTTPException(status_code=400, detail="Checkout must be after checkin")

    # Upsert guest
    guest_result = await db.execute(
        select(Guest).where(Guest.email == payload.guest.email)
    )
    guest = guest_result.scalar_one_or_none()
    if not guest:
        guest = Guest(
            first_name=payload.guest.first_name,
            last_name=payload.guest.last_name,
            email=payload.guest.email,
            phone=payload.guest.phone,
            guest_type=payload.guest.guest_type,
            company=payload.guest.company,
            notes=payload.guest.notes,
        )
        db.add(guest)
        await db.flush()

    # Compute financials
    nights = (payload.checkout_date - payload.checkin_date).days
    room_rate = Decimal(str(room.price_per_night))
    total_amount = room_rate * nights
    commission_amount = (total_amount * COMMISSION_RATE).quantize(Decimal("0.01"))

    booking_ref = await _generate_booking_ref(db, hotel)

    booking = Booking(
        booking_ref=booking_ref,
        hotel_id=hotel.id,
        room_id=room.id,
        guest_id=guest.id,
        tier=hotel.tier,
        checkin_date=payload.checkin_date,
        checkout_date=payload.checkout_date,
        nights=nights,
        room_rate=room_rate,
        total_amount=total_amount,
        commission_amount=commission_amount,
        special_requests=payload.special_requests,
        estimated_arrival=payload.estimated_arrival,
        status="pending",
        guest_type=payload.guest.guest_type,
        source=payload.source,
    )
    db.add(booking)

    # Decrement availability
    room.available_count -= 1

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Booking)
        .where(Booking.id == booking.id)
        .options(
            selectinload(Booking.guest),
            selectinload(Booking.hotel),
            selectinload(Booking.room),
        )
    )
    booking = result.scalar_one()
    booking_dict = booking_to_dict(booking)

    background_tasks.add_task(notify_new_booking, booking_dict)
    background_tasks.add_task(notify_guest_received, booking_dict)

    return booking_dict


@router.get("/{booking_ref}")
async def get_booking(booking_ref: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Booking)
        .where(Booking.booking_ref == booking_ref)
        .options(
            selectinload(Booking.guest),
            selectinload(Booking.hotel),
            selectinload(Booking.room),
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking_to_dict(booking)
