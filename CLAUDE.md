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
- `/my-reservations` — Guest magic link login (email → POST /guests/login → inbox link)
- `/my-stay/:token` — Guest portal (all bookings, inquiries, messaging per reservation)

## Admin
- Default password: `admin123` (set `ADMIN_PASSWORD` in backend/.env to change)
- Frontend sends password as `x-admin-password` header to all `/admin/*` endpoints
- Confirm booking: POST /admin/bookings/{id}/confirm with `{ pms_confirmation: string }`

## Status: FULLY LIVE — June 29, 2026
- **Frontend:** https://stayvoo.com (Vercel)
- **Backend:** https://stayvoo-backend-production.up.railway.app (Railway)
- **All features working:** booking flow, SendGrid emails, Stripe card guarantee, SMS, AI chat, admin modal (4 tabs: Bookings, Inquiries, Active Stays, Billing)

## Deployment Notes
- **Railway:** `cd backend && railway service stayvoo-backend && railway up --detach` to force redeploy (Railway auto-deploy from GitHub can lag)
- **Vercel:** `vercel --prod --yes` from repo root. Root-level `vercel.json` configures the build (installCommand: `cd frontend && npm install`, buildCommand: `cd frontend && npm run build`, outputDirectory: `frontend/dist`)
- **Vercel env vars:** `VITE_API_URL` and `VITE_STRIPE_PUBLISHABLE_KEY` must be set in Vercel dashboard/CLI — they are NOT in git (`.env` is gitignored). Vite bakes them in at build time. Missing = all API calls silently go to `localhost:8000`.
- **Vercel link:** Run `vercel link --yes` from repo root to link CLI to the `vrajkumarpatels-projects/frontend` project before using `vercel env` commands.

## Email Service
- Provider: SendGrid HTTP API (`services/email_service.py`)
- FROM: `hello@stayvoo.com` (Stayvoo) — domain authenticated, goes to inbox
- 8 email functions: `send_booking_received`, `send_booking_confirmed`, `send_pre_arrival_email`, `send_post_stay_email`, `send_invoice_email`, `send_admin_message`, `send_stay_expiry_reminder`, `send_hotel_invoice_email`
- Test endpoint: `GET /admin/test-email` (admin-only)
- Env vars: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL=hello@stayvoo.com`

## Session Log
- **Session 1 (2026-06-29):** Complete — project scaffold, FastAPI + CORS, Vite + Tailwind + react-router-dom, folder structure created.
- **Session 2 (2026-06-29):** Complete — PostgreSQL via Supabase, 5 tables (hotels/rooms/guests/bookings/commissions), 3 hotels + 6 rooms seeded, all API endpoints live and tested.
- **Session 3 (2026-06-29):** Complete — GET /search (3 exclusive + 5 Tier 2 mock hotels), Twilio SMS notifications (5 functions), wired to booking + confirm endpoints via BackgroundTasks.
- **Session 5 (2026-06-29):** Complete — full React frontend: Navbar, HotelCard, SearchBar, RoomCard components; Home, ExclusiveHotels, HotelDetail, SearchResults, BookingForm, Confirmation, Admin pages; complete booking flow from homepage → hotel detail → booking form → confirmation → admin confirm.
- **Session 6 (2026-06-29):** Complete — AI chat widget (Stayvo): `backend/services/ai_chat.py` (Groq llama-3.3-70b-versatile, system prompt), `backend/routers/chat.py` (POST /chat), `frontend/src/components/AIChat.tsx` (fixed bottom-right widget, typing indicator, conversation history, unread dot).
- **Session 7 (2026-06-29):** Complete — FULLY LIVE. SendGrid email service (5 HTML emails, domain authenticated, inbox delivery), Stripe SetupIntent card guarantee, APScheduler daily jobs (9AM pre-arrival, 10AM post-stay), admin booking detail modal (clickable rows, full guest/booking/payment/PMS/action sections, cancel + confirm flow), Railway backend, Vercel frontend, stayvoo.com live.
- **Session 8 (2026-06-29):** Complete — Two-tier booking model. Inquiry model + `/inquiries` table in DB. `POST /inquiries` (saves, fires 3 notifications: internal email, guest auto-reply, SMS). `GET|PUT /admin/inquiries`. Admin panel Inquiries tab (stats, table, detail modal with editable status/notes). ExclusiveHotels page rewritten with inquiry form (9 fields). Home page: two-button hotel cards (Extended Stay Quote + Book Short Stay), two-path section. SearchResults: 7+ night extended stay banner. Navbar: dropdown under Exclusive Hotels. `/groups` page for weddings/sports teams.
- **Session 9 (2026-06-29):** Complete — Messaging system + Stay tracking + Billing. `messages` table + `GET|POST /admin/inquiries/{id}/messages` (admin sends email to guest). `stays` table + full CRUD + checkout + billing endpoints. 3 new email functions. 5 APScheduler jobs total (14-day expiry reminder at 9:05AM, checkout-today alert at 9:10AM, monthly invoices 1st-of-month 8AM). Admin panel: 4 tabs (Bookings, Inquiries, Active Stays, Billing). InquiryDetailModal: Messages tab (chat thread, reply → emails guest) + Convert to Stay button. StayDetailModal with edit/billing/commission/extend/checkout. Billing tab: month selector, summary cards, hotel table, Send Invoice button.
- **Session 10 (2026-06-30):** Complete — Guest account system. Magic link auth (no passwords): `access_token` + `token_expires_at` on Guest, `guest_id` FKs on Inquiry + Stay, `booking_id` FK on Stay. New `stay_messages` table (polymorphic stay/booking/inquiry FK). `services/guests.py`: `get_or_create_guest`, `issue_new_token`, `extend_token`. `routers/guests.py`: POST /guests/login (magic link email), GET /guests/check (auto-fill), GET /my-stay/{token} (full portal data), GET|POST /my-stay/{token}/messages/{type}/{id}. `admin.py`: auto-creates Stay when booking is confirmed; GET|POST /admin/stays/{id}/messages. Booking + inquiry flows: call get_or_create_guest, include portal_url in confirmation emails. `email_service.py`: portal link in booking/inquiry emails; send_guest_login_email, send_stay_message_to_guest, send_guest_message_alert. Frontend: MyReservations page (/my-reservations), GuestPortal page (/my-stay/:token) with booking cards + message threads. Navbar: My Reservations link. BookingForm + ExclusiveHotels: email onBlur → GET /guests/check → auto-fill name/phone for returning guests.
- **Session 10 (2026-06-29):** Complete — Production incident fix. Railway was running pre-Session-9 code (new endpoints 404'd) — fixed with `railway up`. Vercel was missing `VITE_API_URL` + `VITE_STRIPE_PUBLISHABLE_KEY` env vars — Vite baked `localhost:8000` into bundle, all API calls silently failed, admin showed 0. Fixed by `vercel env add` + `vercel --prod --yes`.
- **Session 11 (2026-06-30):** Complete — 10 inspection report fixes. FIX1: removed 5 mock hotels (search shows only 3 real exclusive hotels). FIX2: mobile hamburger menu updated (Exclusive Hotels link, Call Us label). FIX3: AI chat group inquiry capture (detects 5+ rooms/group keywords, collects name+email+rooms+dates one at a time, auto-submits POST /inquiries, shows INQ-{ref}). FIX4: removed fake 4.7★ ratings, added ✨New badge on hotel cards. FIX5: footer with About/Privacy/Terms/WhatsApp links + /about /privacy /terms pages created. FIX6: sitemap.xml in public/ + vercel.json rewrite exclusion. FIX7: date picker on hotel detail page above Book buttons (defaults tomorrow/+1). FIX8: OG + Twitter meta tags in index.html. FIX9: card section reframed as "Hold Your Room — No Charge Today" + explanation text + 100% Free badge. FIX10: InquiryIn Pydantic fixes — num_rooms coercion from string, start_date optional with 14-day default, phone defaults to "Not provided".
- **Session 12 (2026-06-30):** Complete — 5 bug fixes. BUG1: Guest portal booking messages now union-fetch stay_id messages (admin replies visible); guest POST also sets stay_id on linked stay. BUG2: GET|POST /admin/bookings/{id}/messages added; Messages tab in BookingDetailModal (chat thread, admin sends → guest gets email). BUG3: "upcoming" stays now counted in billing active_stays + added purple color badge. BUG4: Bookings tab gets real-time search bar (name/email/ref) + [All/Pending/Confirmed/Cancelled] filter tabs. BUG5: PUT /admin/bookings/{id} (edit dates/rate/requests/guest contact, recalculate totals, notify guest email); Edit tab in BookingDetailModal; last_modified_at/last_modified_by on Booking model + migration.
