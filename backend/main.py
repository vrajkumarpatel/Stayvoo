import os
import logging
from contextlib import asynccontextmanager
from datetime import date, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from database import setup_db, Base, get_db
from models import Hotel, Room, Booking
from routers import hotels, bookings, admin, search, chat

logger = logging.getLogger(__name__)

SEED_HOTELS = [
    {
        "name": "Wyndham Brookfield",
        "brand": "wyndham",
        "address": "1200 S Moorland Rd, Brookfield, WI 53005",
        "phone": "(262) 786-1000",
        "email": "brookfield@wyndham.com",
        "description": "Conveniently located near Froedtert Hospital and Aurora Medical Center. Ideal for medical staff, patients' families, and corporate travelers.",
        "star_rating": 3,
        "amenities": ["Free Parking", "Free WiFi", "Pool", "Fitness Center", "Business Center"],
        "nearby_landmarks": [
            "Froedtert Hospital 2 min",
            "Aurora Medical 5 min",
            "Kohl's HQ 8 min",
            "I-94 3 min",
        ],
        "tier": 1,
        "rooms": [
            {"name": "King Standard", "description": "Spacious king room with work desk and blackout curtains.", "price_per_night": 120.00, "max_guests": 2, "available_count": 15},
            {"name": "Double Queen", "description": "Two queen beds, ideal for families or groups.", "price_per_night": 135.00, "max_guests": 4, "available_count": 12},
        ],
    },
    {
        "name": "Wyndham Waukesha",
        "brand": "wyndham",
        "address": "2111 E Moreland Blvd, Waukesha, WI 53186",
        "phone": "(262) 547-0201",
        "email": "waukesha@wyndham.com",
        "description": "Modern hotel in the heart of Waukesha with easy freeway access and full meeting facilities.",
        "star_rating": 3,
        "amenities": ["Free Parking", "Free WiFi", "Gym", "Meeting Rooms"],
        "nearby_landmarks": [
            "Waukesha Memorial Hospital 4 min",
            "I-94 5 min",
            "Downtown Waukesha 6 min",
        ],
        "tier": 1,
        "rooms": [
            {"name": "King Standard", "description": "King room with premium bedding and work station.", "price_per_night": 120.00, "max_guests": 2, "available_count": 10},
            {"name": "Double Queen", "description": "Double queen room for families or larger groups.", "price_per_night": 135.00, "max_guests": 4, "available_count": 8},
        ],
    },
    {
        "name": "Choice Hotels Waukesha",
        "brand": "choice",
        "address": "2510 E Moreland Blvd, Waukesha, WI 53186",
        "phone": "(262) 542-8000",
        "email": "waukesha@choicehotels.com",
        "description": "Pet-friendly hotel offering free hot breakfast and comfortable rooms at great value.",
        "star_rating": 3,
        "amenities": ["Free Parking", "Free WiFi", "Free Breakfast", "Pet Friendly"],
        "nearby_landmarks": [
            "Waukesha County Expo Center 3 min",
            "I-94 6 min",
            "Pabst Farms 10 min",
        ],
        "tier": 1,
        "rooms": [
            {"name": "King Standard", "description": "King room with breakfast included.", "price_per_night": 120.00, "max_guests": 2, "available_count": 12},
            {"name": "Double Queen", "description": "Double queen with breakfast and pet-friendly option.", "price_per_night": 135.00, "max_guests": 4, "available_count": 10},
        ],
    },
]


async def seed_hotels(session):
    result = await session.execute(select(Hotel))
    if result.scalars().first():
        return

    for h_data in SEED_HOTELS:
        rooms_data = h_data.pop("rooms")
        hotel = Hotel(**h_data)
        session.add(hotel)
        await session.flush()
        for r_data in rooms_data:
            session.add(Room(hotel_id=hotel.id, **r_data))
        h_data["rooms"] = rooms_data

    await session.commit()


async def _daily_pre_arrival_job():
    from database import _AsyncSessionLocal
    from services.email_service import send_pre_arrival_email
    from routers.bookings import booking_to_dict as _btd

    tomorrow = date.today() + timedelta(days=1)
    async with _AsyncSessionLocal() as session:
        result = await session.execute(
            select(Booking)
            .where(Booking.status == "confirmed", Booking.checkin_date == tomorrow)
            .options(
                selectinload(Booking.guest),
                selectinload(Booking.hotel),
                selectinload(Booking.room),
            )
        )
        bookings_list = result.scalars().all()
        for b in bookings_list:
            try:
                await send_pre_arrival_email(_btd(b))
            except Exception as e:
                logger.error("Pre-arrival email failed for %s: %s", b.booking_ref, e)
    logger.info("Pre-arrival job complete: %d bookings for %s", len(bookings_list), tomorrow)


async def _daily_post_stay_job():
    from database import _AsyncSessionLocal
    from services.email_service import send_post_stay_email, send_invoice_email
    from routers.bookings import booking_to_dict as _btd

    yesterday = date.today() - timedelta(days=1)
    async with _AsyncSessionLocal() as session:
        result = await session.execute(
            select(Booking)
            .where(Booking.status == "confirmed", Booking.checkout_date == yesterday)
            .options(
                selectinload(Booking.guest),
                selectinload(Booking.hotel),
                selectinload(Booking.room),
            )
        )
        bookings_list = result.scalars().all()
        for b in bookings_list:
            try:
                bd = _btd(b)
                await send_post_stay_email(bd)
                await send_invoice_email(bd)
            except Exception as e:
                logger.error("Post-stay email failed for %s: %s", b.booking_ref, e)
    logger.info("Post-stay job complete: %d bookings for %s", len(bookings_list), yesterday)


@asynccontextmanager
async def lifespan(app: FastAPI):
    engine = setup_db()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from database import _AsyncSessionLocal
    async with _AsyncSessionLocal() as session:
        await seed_hotels(session)

    scheduler = AsyncIOScheduler()
    scheduler.add_job(_daily_pre_arrival_job, "cron", hour=9, minute=0)
    scheduler.add_job(_daily_post_stay_job, "cron", hour=10, minute=0)
    scheduler.start()
    logger.info("APScheduler started — pre-arrival 9AM, post-stay 10AM")

    yield

    scheduler.shutdown()
    await engine.dispose()


_allowed_origins = [
    "http://localhost:5173",
    "https://stayvoo.com",
    "https://www.stayvoo.com",
]
if _frontend_url := os.getenv("FRONTEND_URL"):
    _allowed_origins.append(_frontend_url)

app = FastAPI(title="Stayvoo API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hotels.router)
app.include_router(bookings.router)
app.include_router(admin.router)
app.include_router(search.router)
app.include_router(chat.router)


@app.get("/")
def root():
    return {"status": "Stayvoo API running"}


@app.get("/health")
def health():
    return {"status": "ok"}
