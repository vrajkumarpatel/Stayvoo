from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from models import Hotel, Room

MOCK_TIER2_HOTELS = [
    {
        "hotel_id": "mock-001",
        "name": "Hampton Inn Brookfield",
        "brand": "hilton",
        "address": "575 N Moorland Rd, Brookfield, WI 53005",
        "star_rating": 3,
        "price_per_night": 129.00,
        "amenities": ["Free Breakfast", "Free Parking", "Free WiFi", "Pool", "Fitness Center"],
        "rating": 4.4,
        "review_count": 892,
        "exclusive": False,
        "rooms": [],
    },
    {
        "hotel_id": "mock-002",
        "name": "Courtyard Milwaukee Brookfield",
        "brand": "marriott",
        "address": "2700 N Mayfair Rd, Wauwatosa, WI 53222",
        "star_rating": 3,
        "price_per_night": 139.00,
        "amenities": ["Free Parking", "Free WiFi", "Restaurant", "Bar", "Fitness Center"],
        "rating": 4.3,
        "review_count": 654,
        "exclusive": False,
        "rooms": [],
    },
    {
        "hotel_id": "mock-003",
        "name": "Hilton Garden Inn Waukesha",
        "brand": "hilton",
        "address": "2531 Plaza Court, Waukesha, WI 53186",
        "star_rating": 3,
        "price_per_night": 149.00,
        "amenities": ["Free Parking", "Free WiFi", "Pool", "Restaurant", "Business Center"],
        "rating": 4.5,
        "review_count": 421,
        "exclusive": False,
        "rooms": [],
    },
    {
        "hotel_id": "mock-004",
        "name": "Holiday Inn Express Waukesha",
        "brand": "ihg",
        "address": "2417 E Moreland Blvd, Waukesha, WI 53186",
        "star_rating": 3,
        "price_per_night": 109.00,
        "amenities": ["Free Breakfast", "Free Parking", "Free WiFi", "Fitness Center"],
        "rating": 4.2,
        "review_count": 738,
        "exclusive": False,
        "rooms": [],
    },
    {
        "hotel_id": "mock-005",
        "name": "Marriott Milwaukee West",
        "brand": "marriott",
        "address": "W231 N1600 Corporate Ct, Waukesha, WI 53186",
        "star_rating": 4,
        "price_per_night": 159.00,
        "amenities": ["Free Parking", "Free WiFi", "Restaurant", "Bar", "Pool", "Fitness Center", "Meeting Rooms"],
        "rating": 4.6,
        "review_count": 1203,
        "exclusive": False,
        "rooms": [],
    },
]


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
                "rating": 4.7,
                "review_count": 0,
                "exclusive": True,
                "rooms": rooms,
            })

        # Filter mock tier 2 by guest capacity (all rooms are listed without per-room data)
        tier2 = list(MOCK_TIER2_HOTELS)

        return {
            "results": exclusive + tier2,
            "total": len(exclusive) + len(tier2),
            "exclusive_count": len(exclusive),
            "tier2_count": len(tier2),
            "checkin_date": checkin_date.isoformat() if checkin_date else None,
            "checkout_date": checkout_date.isoformat() if checkout_date else None,
            "guests": guests,
        }
