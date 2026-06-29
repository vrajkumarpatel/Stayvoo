# Stayvoo — Project CLAUDE.md

## Project Overview
Stayvoo is a property rental / stay booking platform.

## Tech Stack
- **Frontend:** React + TypeScript + Vite + Tailwind CSS v4 + react-router-dom — `frontend/`
- **Backend:** Python + FastAPI + SQLAlchemy — `backend/`
- **LLM:** Groq API (`llama-3.3-70b-versatile`)
- **No paid APIs** unless explicitly decided otherwise

## Running the Project
```bash
# Backend (from backend/)
./venv/Scripts/uvicorn main:app --reload          # Windows
# source venv/bin/activate && uvicorn main:app --reload  # Mac/Linux

# Frontend (from frontend/)
npm run dev
```

## Folder Structure
```
Stayvoo/
├── backend/
│   ├── main.py          # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env             # secrets (gitignored)
│   └── venv/
└── frontend/
    └── src/
        ├── components/  # reusable UI components
        ├── pages/        # route-level page components
        ├── hooks/        # custom React hooks
        ├── lib/          # API client, utilities
        ├── types/        # TypeScript interfaces
        └── context/      # React context providers
```

## Environment Variables (backend/.env)
```
DATABASE_URL=
SECRET_KEY=
GROQ_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
SENDGRID_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Backend Structure
```
backend/
├── main.py          # FastAPI app, lifespan (create tables + seed)
├── database.py      # Async SQLAlchemy engine (asyncpg, statement_cache_size=0 for PgBouncer)
├── models.py        # hotels, rooms, guests, bookings, commissions
├── requirements.txt
├── .env             # secrets (gitignored)
├── routers/
│   ├── hotels.py    # GET /hotels, GET /hotels/{id}
│   ├── bookings.py  # POST /bookings, GET /bookings/{ref}
│   ├── admin.py     # GET|POST /admin/bookings, confirm, pre-arrival, post-stay
│   └── search.py    # GET /search?checkin_date&checkout_date&guests
└── services/
    ├── hotel_search.py   # HotelSearchService — Tier 1 DB + 5 mock Tier 2 hotels
    └── notifications.py  # Twilio SMS: new_booking, guest_received, confirmed, pre_arrival, post_stay
```

## Notifications
- All 5 SMS functions in `services/notifications.py`
- Fire via `BackgroundTasks` so they never block the response
- Gracefully skip (log warning) if Twilio creds not set
- `POST /bookings` → fires `notify_new_booking` + `notify_guest_received`
- `POST /admin/bookings/{id}/confirm` → fires `notify_guest_confirmed`
- `POST /admin/bookings/{id}/send-pre-arrival` → manual trigger for pre-arrival SMS
- `POST /admin/bookings/{id}/send-post-stay` → manual trigger for post-stay SMS
- Fill in `.env`: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `NOTIFY_PHONE`

## Supabase Notes
- Direct host (`db.xxx.supabase.co`) is IPv6-only — Python on Windows can't connect
- Use **Transaction Pooler**: `aws-1-us-east-2.pooler.supabase.com:6543`
- Username format: `postgres.[project-ref]`
- asyncpg requires `statement_cache_size=0` when using PgBouncer transaction mode

## Frontend Routes
- `/` — Home (hero, partner hotels, why Stayvoo, who we serve)
- `/exclusive` — Exclusive Hotels + group inquiry form
- `/hotels/:id` — Hotel detail (gallery, amenities, rooms)
- `/search` — Search results (exclusive-first)
- `/book` — Booking form (hotel_id, room_id, checkin, checkout in query params)
- `/confirmation` — Booking confirmation (ref in query param, fetches from GET /bookings/{ref})
- `/admin` — Admin dashboard (password → localStorage, x-admin-password header to backend)

## Admin
- Default password: `admin123` (set `ADMIN_PASSWORD` in backend/.env to change)
- Frontend sends password as `x-admin-password` header to all `/admin/*` endpoints
- Confirm booking: POST /admin/bookings/{id}/confirm with `{ pms_confirmation: string }`

## Session Log
- **Session 1 (2026-06-29):** Complete — project scaffold, FastAPI + CORS, Vite + Tailwind + react-router-dom, folder structure created.
- **Session 2 (2026-06-29):** Complete — PostgreSQL via Supabase, 5 tables (hotels/rooms/guests/bookings/commissions), 3 hotels + 6 rooms seeded, all API endpoints live and tested.
- **Session 3 (2026-06-29):** Complete — GET /search (3 exclusive + 5 Tier 2 mock hotels), Twilio SMS notifications (5 functions), wired to booking + confirm endpoints via BackgroundTasks.
- **Session 5 (2026-06-29):** Complete — full React frontend: Navbar, HotelCard, SearchBar, RoomCard components; Home, ExclusiveHotels, HotelDetail, SearchResults, BookingForm, Confirmation, Admin pages; complete booking flow from homepage → hotel detail → booking form → confirmation → admin confirm.
