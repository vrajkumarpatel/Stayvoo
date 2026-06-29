from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import Hotel, Room

router = APIRouter(prefix="/hotels", tags=["hotels"])


def hotel_to_dict(hotel: Hotel, include_rooms: bool = True) -> dict:
    d = {
        "id": str(hotel.id),
        "name": hotel.name,
        "brand": hotel.brand,
        "address": hotel.address,
        "phone": hotel.phone,
        "email": hotel.email,
        "description": hotel.description,
        "star_rating": hotel.star_rating,
        "photo_urls": hotel.photo_urls or [],
        "amenities": hotel.amenities or [],
        "nearby_landmarks": hotel.nearby_landmarks or [],
        "tier": hotel.tier,
        "active": hotel.active,
        "created_at": hotel.created_at.isoformat() if hotel.created_at else None,
    }
    if include_rooms:
        d["rooms"] = [room_to_dict(r) for r in hotel.rooms]
    return d


def room_to_dict(room: Room) -> dict:
    return {
        "id": str(room.id),
        "hotel_id": str(room.hotel_id),
        "name": room.name,
        "description": room.description,
        "price_per_night": float(room.price_per_night),
        "max_guests": room.max_guests,
        "photos": room.photos or [],
        "amenities": room.amenities or [],
        "available_count": room.available_count,
    }


@router.get("")
async def get_hotels(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Hotel)
        .where(Hotel.tier == 1, Hotel.active == True)
        .options(selectinload(Hotel.rooms))
        .order_by(Hotel.name)
    )
    hotels = result.scalars().all()
    return [hotel_to_dict(h) for h in hotels]


@router.get("/{hotel_id}")
async def get_hotel(hotel_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Hotel)
        .where(Hotel.id == hotel_id)
        .options(selectinload(Hotel.rooms))
    )
    hotel = result.scalar_one_or_none()
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return hotel_to_dict(hotel)
