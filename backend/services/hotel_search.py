from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from models import Hotel, Room


class HotelSearchService:

    @staticmethod
    async def search_hotels(
        db: AsyncSession,
        checkin_date: date | None = None,
        checkout_date: date | None = None,
        guests: int = 1,
    ) -> dict:
        result = await db.execute(
            select(Hotel)
            .where(Hotel.tier == 1, Hotel.active == True)
            .options(selectinload(Hotel.rooms))
            .order_by(Hotel.name)
        )
        db_hotels = result.scalars().all()

        exclusive = []
        for h in db_hotels:
            rooms = [
                {
                    "room_id": str(r.id),
                    "name": r.name,
                    "price_per_night": float(r.price_per_night),
                    "max_guests": r.max_guests,
                    "available_count": r.available_count,
                    "amenities": r.amenities or [],
                }
                for r in h.rooms
                if r.max_guests >= guests and r.available_count > 0
            ]
            price = float(min(r.price_per_night for r in h.rooms)) if h.rooms else 0.0
            exclusive.append({
                "hotel_id": str(h.id),
                "name": h.name,
                "brand": h.brand,
                "address": h.address,
                "phone": h.phone,
                "star_rating": h.star_rating,
                "price_per_night": price,
                "amenities": h.amenities or [],
                "nearby_landmarks": h.nearby_landmarks or [],
                "exclusive": True,
                "rooms": rooms,
            })

        return {
            "results": exclusive,
            "total": len(exclusive),
            "exclusive_count": len(exclusive),
            "tier2_count": 0,
            "checkin_date": checkin_date.isoformat() if checkin_date else None,
            "checkout_date": checkout_date.isoformat() if checkout_date else None,
            "guests": guests,
        }
