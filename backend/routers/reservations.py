import os
import logging
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from database import get_db
from models import Hotel, Room, Guest, Reservation, CommissionRate
from services.guests import get_or_create_guest
from services.notifications import notify_new_booking, notify_guest_received
from services.email_service import send_reservation_received

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reservations", tags=["reservations"])

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


class ReservationIn(BaseModel):
    hotel_id: str
    room_id: str
    guest: GuestIn
    checkin_date: date
    checkout_date: date
    special_requests: str | None = None
    estimated_arrival: str | None = None
    source: str = "website"
    stripe_payment_method_id: str | None = None


def reservation_to_dict(r: Reservation) -> dict:
    return {
        "id": str(r.id),
        "reservation_ref": r.reservation_ref,
        "guest_id": str(r.guest_id) if r.guest_id else None,
        "hotel_source": r.hotel_source,
        "hotel_source_id": str(r.hotel_source_id) if r.hotel_source_id else None,
        "room_source_id": str(r.room_source_id) if r.room_source_id else None,
        "hotel_name_snapshot": r.hotel_name_snapshot,
        "hotel_address_snapshot": r.hotel_address_snapshot,
        "room_type_snapshot": r.room_type_snapshot,
        "guest_first_name": r.guest_first_name,
        "guest_last_name": r.guest_last_name,
        "guest_email": r.guest_email,
        "guest_phone": r.guest_phone,
        "guest_type": r.guest_type,
        "checkin_date": r.checkin_date.isoformat(),
        "checkout_date": r.checkout_date.isoformat(),
        "nights": r.nights,
        "rate_per_night": float(r.rate_per_night),
        "total_amount": float(r.total_amount),
        "amount_paid": float(r.amount_paid) if r.amount_paid else 0.0,
        "balance_due": float(r.balance_due),
        "commission_rate": float(r.commission_rate),
        "commission_amount": float(r.commission_amount),
        "commission_paid": r.commission_paid,
        "commission_source_note": r.commission_source_note,
        "special_requests": r.special_requests,
        "estimated_arrival": r.estimated_arrival,
        "pms_confirmation": r.pms_confirmation,
        "tier": r.tier,
        "source": r.source,
        "card_last4": r.card_last4,
        "card_brand": r.card_brand,
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "confirmed_at": r.confirmed_at.isoformat() if r.confirmed_at else None,
        "cancelled_at": r.cancelled_at.isoformat() if r.cancelled_at else None,
        "checked_out_at": r.checked_out_at.isoformat() if r.checked_out_at else None,
        "last_modified_at": r.last_modified_at.isoformat() if r.last_modified_at else None,
        "last_modified_by": r.last_modified_by,
        "guest": {
            "id": str(r.guest.id),
            "first_name": r.guest.first_name,
            "last_name": r.guest.last_name,
            "email": r.guest.email,
            "phone": r.guest.phone,
            "guest_type": r.guest.guest_type,
            "company": r.guest.company,
            "total_stays": r.guest.total_stays,
        } if r.guest else None,
    }


async def _generate_reservation_ref(db: AsyncSession, hotel: Hotel) -> str:
    brand_code = BRAND_CODES.get(hotel.brand.lower(), hotel.brand[:3].upper())

    result = await db.execute(
        select(Hotel)
        .where(Hotel.brand == hotel.brand, Hotel.active == True)
        .order_by(Hotel.created_at)
    )
    brand_hotels = result.scalars().all()
    hotel_ids = [str(h.id) for h in brand_hotels]
    hotel_num = hotel_ids.index(str(hotel.id)) + 1

    count_result = await db.execute(select(func.count()).select_from(Reservation))
    total = count_result.scalar() or 0

    return f"SD-{brand_code}{hotel_num}-{total + 1:04d}"


async def _get_commission_rate(db: AsyncSession, hotel_source: str = "exclusive") -> tuple[Decimal, str]:
    result = await db.execute(
        select(CommissionRate).where(CommissionRate.hotel_source == hotel_source)
    )
    cr = result.scalar_one_or_none()
    if cr:
        return Decimal(str(cr.default_rate)), cr.notes or hotel_source
    return Decimal("10.00"), f"default fallback for {hotel_source}"


@router.post("/setup-intent")
async def create_setup_intent():
    import stripe as stripe_lib
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe_key:
        return {"client_secret": None}
    stripe_lib.api_key = stripe_key
    intent = stripe_lib.SetupIntent.create(usage="off_session")
    return {"client_secret": intent.client_secret}


@router.post("")
async def create_reservation(
    payload: ReservationIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    hotel_result = await db.execute(
        select(Hotel).where(Hotel.id == payload.hotel_id, Hotel.active == True)
    )
    hotel = hotel_result.scalar_one_or_none()
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")

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

    guest = await get_or_create_guest(
        db,
        payload.guest.email,
        payload.guest.first_name,
        payload.guest.last_name,
        payload.guest.phone or "",
    )
    if payload.guest.guest_type:
        guest.guest_type = payload.guest.guest_type
    if payload.guest.company and not guest.company:
        guest.company = payload.guest.company
    if payload.guest.notes and not guest.notes:
        guest.notes = payload.guest.notes

    nights = (payload.checkout_date - payload.checkin_date).days
    rate_per_night = Decimal(str(room.price_per_night))
    total_amount = rate_per_night * nights

    commission_rate, commission_note = await _get_commission_rate(db, "exclusive")
    commission_amount = (total_amount * commission_rate / Decimal("100")).quantize(Decimal("0.01"))

    reservation_ref = await _generate_reservation_ref(db, hotel)

    card_last4 = None
    card_brand = None
    if payload.stripe_payment_method_id:
        import stripe as stripe_lib
        stripe_key = os.getenv("STRIPE_SECRET_KEY")
        if stripe_key:
            try:
                stripe_lib.api_key = stripe_key
                pm = stripe_lib.PaymentMethod.retrieve(payload.stripe_payment_method_id)
                card_last4 = pm.card.last4
                card_brand = pm.card.brand
            except Exception as e:
                logger.warning("Could not retrieve Stripe payment method: %s", e)

    reservation = Reservation(
        reservation_ref=reservation_ref,
        guest_id=guest.id,
        hotel_source="exclusive",
        hotel_source_id=hotel.id,
        room_source_id=room.id,
        hotel_name_snapshot=hotel.name,
        hotel_address_snapshot=hotel.address,
        room_type_snapshot=room.name,
        guest_first_name=payload.guest.first_name,
        guest_last_name=payload.guest.last_name,
        guest_email=payload.guest.email,
        guest_phone=payload.guest.phone,
        guest_type=payload.guest.guest_type,
        checkin_date=payload.checkin_date,
        checkout_date=payload.checkout_date,
        nights=nights,
        rate_per_night=rate_per_night,
        total_amount=total_amount,
        amount_paid=Decimal("0"),
        balance_due=total_amount,
        commission_rate=commission_rate,
        commission_amount=commission_amount,
        commission_source_note=commission_note,
        special_requests=payload.special_requests,
        estimated_arrival=payload.estimated_arrival,
        status="pending",
        tier=hotel.tier,
        source=payload.source,
        stripe_payment_method_id=payload.stripe_payment_method_id,
        card_last4=card_last4,
        card_brand=card_brand,
    )
    db.add(reservation)

    room.available_count -= 1

    await db.commit()

    result = await db.execute(
        select(Reservation)
        .where(Reservation.id == reservation.id)
        .options(selectinload(Reservation.guest))
    )
    reservation = result.scalar_one()
    res_dict = reservation_to_dict(reservation)
    if reservation.guest and reservation.guest.access_token:
        res_dict["portal_url"] = f"https://stayvoo.com/my-stay/{reservation.guest.access_token}"

    background_tasks.add_task(notify_new_booking, {
        "booking_ref": res_dict["reservation_ref"],
        "guest": res_dict.get("guest"),
        "hotel": {"name": res_dict["hotel_name_snapshot"]},
        "room": {"name": res_dict["room_type_snapshot"]},
        "checkin_date": res_dict["checkin_date"],
        "checkout_date": res_dict["checkout_date"],
        "nights": res_dict["nights"],
        "total_amount": res_dict["total_amount"],
    })
    background_tasks.add_task(notify_guest_received, {
        "booking_ref": res_dict["reservation_ref"],
        "guest": res_dict.get("guest"),
    })
    background_tasks.add_task(send_reservation_received, res_dict)

    return res_dict


@router.get("/{reservation_ref}")
async def get_reservation(reservation_ref: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Reservation)
        .where(Reservation.reservation_ref == reservation_ref)
        .options(selectinload(Reservation.guest))
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation_to_dict(reservation)
