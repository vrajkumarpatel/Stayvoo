import os
import uuid
import logging
from datetime import date
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Inquiry
from services.email_service import send_inquiry_notification, send_inquiry_auto_reply
from services.notifications import notify_new_inquiry

logger = logging.getLogger(__name__)
router = APIRouter(tags=["inquiries"])


def _verify_admin(x_admin_password: str = Header(...)):
    expected = os.getenv("ADMIN_PASSWORD", "admin123")
    if x_admin_password != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


class InquiryIn(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    guest_type: str
    hotel_preference: Optional[str] = None
    num_rooms: int
    length_of_stay: str
    start_date: date
    special_requirements: Optional[str] = None
    source: Optional[str] = "website"


class InquiryUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


def inquiry_to_dict(inq: Inquiry) -> dict:
    return {
        "id": str(inq.id),
        "first_name": inq.first_name,
        "last_name": inq.last_name,
        "email": inq.email,
        "phone": inq.phone,
        "guest_type": inq.guest_type,
        "hotel_preference": inq.hotel_preference,
        "num_rooms": inq.num_rooms,
        "length_of_stay": inq.length_of_stay,
        "start_date": str(inq.start_date),
        "special_requirements": inq.special_requirements,
        "source": inq.source,
        "status": inq.status,
        "notes": inq.notes,
        "created_at": inq.created_at.isoformat() if inq.created_at else None,
    }


@router.post("/inquiries")
async def create_inquiry(
    payload: InquiryIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    inq = Inquiry(id=uuid.uuid4(), **payload.model_dump())
    db.add(inq)
    await db.commit()
    await db.refresh(inq)

    inq_dict = inquiry_to_dict(inq)
    background_tasks.add_task(send_inquiry_notification, inq_dict)
    background_tasks.add_task(send_inquiry_auto_reply, inq_dict)
    background_tasks.add_task(notify_new_inquiry, inq_dict)

    return inq_dict


@router.get("/admin/inquiries")
async def list_inquiries(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    result = await db.execute(select(Inquiry).order_by(Inquiry.created_at.desc()))
    return [inquiry_to_dict(inq) for inq in result.scalars().all()]


@router.put("/admin/inquiries/{inquiry_id}")
async def update_inquiry(
    inquiry_id: str,
    payload: InquiryUpdate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    result = await db.execute(select(Inquiry).where(Inquiry.id == inquiry_id))
    inq = result.scalar_one_or_none()
    if not inq:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    if payload.status is not None:
        inq.status = payload.status
    if payload.notes is not None:
        inq.notes = payload.notes
    await db.commit()
    await db.refresh(inq)
    return inquiry_to_dict(inq)
