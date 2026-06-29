import os
import uuid
import logging
from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract
from database import get_db
from models import Stay, Hotel

logger = logging.getLogger(__name__)
router = APIRouter(tags=["stays"])


def _verify_admin(x_admin_password: str = Header(...)):
    expected = os.getenv("ADMIN_PASSWORD", "admin123")
    if x_admin_password != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


def stay_to_dict(s: Stay) -> dict:
    return {
        "id": str(s.id),
        "inquiry_id": str(s.inquiry_id) if s.inquiry_id else None,
        "guest_first_name": s.guest_first_name,
        "guest_last_name": s.guest_last_name,
        "guest_email": s.guest_email,
        "guest_phone": s.guest_phone,
        "guest_type": s.guest_type,
        "hotel_id": str(s.hotel_id) if s.hotel_id else None,
        "hotel_name": s.hotel_name,
        "room_number": s.room_number,
        "num_rooms": s.num_rooms,
        "checkin_date": str(s.checkin_date),
        "expected_checkout": str(s.expected_checkout),
        "actual_checkout": str(s.actual_checkout) if s.actual_checkout else None,
        "nights_total": s.nights_total,
        "rate_per_night": float(s.rate_per_night),
        "total_amount": float(s.total_amount),
        "amount_paid": float(s.amount_paid),
        "balance_due": float(s.balance_due),
        "commission_rate": float(s.commission_rate),
        "commission_amount": float(s.commission_amount),
        "commission_paid": s.commission_paid,
        "commission_paid_date": str(s.commission_paid_date) if s.commission_paid_date else None,
        "pms_confirmation": s.pms_confirmation,
        "notes": s.notes,
        "status": s.status,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


class StayIn(BaseModel):
    inquiry_id: Optional[str] = None
    guest_first_name: str
    guest_last_name: str
    guest_email: str
    guest_phone: str
    guest_type: Optional[str] = None
    hotel_id: Optional[str] = None
    hotel_name: str
    room_number: Optional[str] = None
    num_rooms: int = 1
    checkin_date: date
    expected_checkout: date
    nights_total: int
    rate_per_night: float
    commission_rate: float = 10.0
    pms_confirmation: Optional[str] = None
    notes: Optional[str] = None


class StayUpdate(BaseModel):
    guest_first_name: Optional[str] = None
    guest_last_name: Optional[str] = None
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    guest_type: Optional[str] = None
    hotel_name: Optional[str] = None
    room_number: Optional[str] = None
    num_rooms: Optional[int] = None
    expected_checkout: Optional[date] = None
    nights_total: Optional[int] = None
    rate_per_night: Optional[float] = None
    amount_paid: Optional[float] = None
    commission_rate: Optional[float] = None
    commission_paid: Optional[bool] = None
    commission_paid_date: Optional[date] = None
    pms_confirmation: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class CheckoutIn(BaseModel):
    actual_checkout: date
    notes: Optional[str] = None


class InvoiceIn(BaseModel):
    hotel_name: str


@router.get("/admin/stays")
async def list_stays(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    q = select(Stay).order_by(Stay.checkin_date.desc())
    if status:
        q = q.where(Stay.status == status)
    result = await db.execute(q)
    return [stay_to_dict(s) for s in result.scalars().all()]


@router.get("/admin/stays/{stay_id}")
async def get_stay(
    stay_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    result = await db.execute(select(Stay).where(Stay.id == stay_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Stay not found")
    return stay_to_dict(s)


@router.post("/admin/stays")
async def create_stay(
    payload: StayIn,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    total = payload.nights_total * payload.rate_per_night
    commission = round(total * payload.commission_rate / 100, 2)

    s = Stay(
        id=uuid.uuid4(),
        inquiry_id=payload.inquiry_id,
        guest_first_name=payload.guest_first_name,
        guest_last_name=payload.guest_last_name,
        guest_email=payload.guest_email,
        guest_phone=payload.guest_phone,
        guest_type=payload.guest_type,
        hotel_id=payload.hotel_id,
        hotel_name=payload.hotel_name,
        room_number=payload.room_number,
        num_rooms=payload.num_rooms,
        checkin_date=payload.checkin_date,
        expected_checkout=payload.expected_checkout,
        nights_total=payload.nights_total,
        rate_per_night=payload.rate_per_night,
        total_amount=total,
        amount_paid=0,
        balance_due=total,
        commission_rate=payload.commission_rate,
        commission_amount=commission,
        pms_confirmation=payload.pms_confirmation,
        notes=payload.notes,
        status="active",
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return stay_to_dict(s)


@router.put("/admin/stays/{stay_id}")
async def update_stay(
    stay_id: str,
    payload: StayUpdate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    result = await db.execute(select(Stay).where(Stay.id == stay_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Stay not found")

    update_data = payload.model_dump(exclude_none=True)
    for k, v in update_data.items():
        setattr(s, k, v)

    if any(f in update_data for f in ("nights_total", "rate_per_night", "commission_rate")):
        total = float(s.nights_total) * float(s.rate_per_night)
        s.total_amount = total
        s.balance_due = total - float(s.amount_paid)
        s.commission_amount = round(total * float(s.commission_rate) / 100, 2)

    s.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(s)
    return stay_to_dict(s)


@router.post("/admin/stays/{stay_id}/checkout")
async def checkout_stay(
    stay_id: str,
    payload: CheckoutIn,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    result = await db.execute(select(Stay).where(Stay.id == stay_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Stay not found")

    s.actual_checkout = payload.actual_checkout
    s.status = "checked_out"
    if payload.notes:
        s.notes = ((s.notes or "") + f"\n[Checkout]: {payload.notes}").strip()
    s.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(s)
    return stay_to_dict(s)


@router.get("/admin/billing/{month}")
async def billing_summary(
    month: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    try:
        year, month_num = (int(x) for x in month.split("-"))
    except Exception:
        raise HTTPException(status_code=400, detail="Month must be YYYY-MM format")

    result = await db.execute(
        select(Stay)
        .where(
            extract("year", Stay.checkin_date) == year,
            extract("month", Stay.checkin_date) == month_num,
        )
        .order_by(Stay.hotel_name, Stay.checkin_date)
    )
    stays = result.scalars().all()

    by_hotel: dict = {}
    for s in stays:
        key = s.hotel_name
        if key not in by_hotel:
            by_hotel[key] = {"hotel_name": key, "hotel_id": str(s.hotel_id) if s.hotel_id else None, "stays": []}
        by_hotel[key]["stays"].append(stay_to_dict(s))

    summary = []
    for data in by_hotel.values():
        sl = data["stays"]
        revenue = sum(float(s["total_amount"]) for s in sl)
        commission = sum(float(s["commission_amount"]) for s in sl)
        comm_paid = sum(float(s["commission_amount"]) for s in sl if s["commission_paid"])
        summary.append({
            "hotel_name": data["hotel_name"],
            "hotel_id": data["hotel_id"],
            "total_stays": len(sl),
            "active_stays": sum(1 for s in sl if s["status"] in ("active", "extended")),
            "completed_stays": sum(1 for s in sl if s["status"] == "checked_out"),
            "total_revenue": revenue,
            "total_commission": commission,
            "commission_paid": comm_paid,
            "commission_pending": commission - comm_paid,
            "stays": sl,
        })

    total_revenue = sum(h["total_revenue"] for h in summary)
    total_commission = sum(h["total_commission"] for h in summary)
    comm_paid_total = sum(h["commission_paid"] for h in summary)

    return {
        "month": month,
        "total_stays": len(stays),
        "total_revenue": total_revenue,
        "total_commission": total_commission,
        "commission_paid": comm_paid_total,
        "commission_pending": total_commission - comm_paid_total,
        "by_hotel": summary,
    }


@router.post("/admin/billing/invoice/{month}")
async def send_invoice(
    month: str,
    payload: InvoiceIn,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    from services.email_service import send_hotel_invoice_email

    try:
        year, month_num = (int(x) for x in month.split("-"))
    except Exception:
        raise HTTPException(status_code=400, detail="Month must be YYYY-MM format")

    hotel_result = await db.execute(select(Hotel).where(Hotel.name == payload.hotel_name))
    hotel = hotel_result.scalar_one_or_none()
    hotel_email = hotel.email if hotel and hotel.email else os.getenv("SENDGRID_FROM_EMAIL", "hello@stayvoo.com")

    stays_result = await db.execute(
        select(Stay).where(
            Stay.hotel_name == payload.hotel_name,
            extract("year", Stay.checkin_date) == year,
            extract("month", Stay.checkin_date) == month_num,
        )
    )
    stays = stays_result.scalars().all()
    stays_dicts = [stay_to_dict(s) for s in stays]

    total_revenue = sum(float(s["total_amount"]) for s in stays_dicts)
    total_commission = sum(float(s["commission_amount"]) for s in stays_dicts)

    await send_hotel_invoice_email(payload.hotel_name, hotel_email, month, {
        "stays": stays_dicts,
        "total_revenue": total_revenue,
        "total_commission": total_commission,
    })

    return {
        "status": "sent",
        "hotel_name": payload.hotel_name,
        "hotel_email": hotel_email,
        "month": month,
        "total_stays": len(stays),
    }
