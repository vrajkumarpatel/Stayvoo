import os
import re
import uuid
import logging
from datetime import date, timedelta
from typing import Optional, Union
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Inquiry, Message
from services.guests import get_or_create_guest
from services.email_service import send_inquiry_notification, send_inquiry_auto_reply, send_admin_message
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
    phone: str = "Not provided"
    guest_type: str = "group"
    hotel_preference: Optional[str] = None
    num_rooms: Union[int, str] = 1
    length_of_stay: str = "TBD"
    start_date: Optional[Union[date, str]] = None
    special_requirements: Optional[str] = None
    source: Optional[str] = "website"
    sms_consent: bool = False

    @field_validator('num_rooms', mode='before')
    @classmethod
    def coerce_num_rooms(cls, v):
        if isinstance(v, str):
            m = re.search(r'\d+', v)
            return int(m.group()) if m else 1
        return v

    @field_validator('start_date', mode='before')
    @classmethod
    def coerce_start_date(cls, v):
        if v is None:
            return date.today() + timedelta(days=14)
        if isinstance(v, str):
            try:
                return date.fromisoformat(v)
            except ValueError:
                return date.today() + timedelta(days=14)
        return v


class InquiryUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class MessageIn(BaseModel):
    sender: str
    sender_name: str
    message: str


def msg_to_dict(m: Message) -> dict:
    return {
        "id": str(m.id),
        "inquiry_id": str(m.inquiry_id),
        "sender": m.sender,
        "sender_name": m.sender_name,
        "message": m.message,
        "is_read": m.is_read,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


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
        "sms_consent": inq.sms_consent,
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
    guest = await get_or_create_guest(db, payload.email, payload.first_name, payload.last_name, payload.phone)

    inq = Inquiry(id=uuid.uuid4(), guest_id=guest.id, **payload.model_dump())
    db.add(inq)
    await db.commit()
    await db.refresh(inq)

    inq_dict = inquiry_to_dict(inq)
    if guest.access_token:
        inq_dict["portal_url"] = f"https://stayvoo.com/my-stay/{guest.access_token}"
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


@router.get("/admin/inquiries/{inquiry_id}/messages")
async def list_messages(
    inquiry_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    result = await db.execute(
        select(Message)
        .where(Message.inquiry_id == inquiry_id)
        .order_by(Message.created_at.asc())
    )
    return [msg_to_dict(m) for m in result.scalars().all()]


@router.post("/admin/inquiries/{inquiry_id}/messages")
async def send_message(
    inquiry_id: str,
    payload: MessageIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    result = await db.execute(select(Inquiry).where(Inquiry.id == inquiry_id))
    inq = result.scalar_one_or_none()
    if not inq:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    msg = Message(
        id=uuid.uuid4(),
        inquiry_id=inquiry_id,
        sender=payload.sender,
        sender_name=payload.sender_name,
        message=payload.message,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    if payload.sender == "admin":
        background_tasks.add_task(send_admin_message, inquiry_to_dict(inq), payload.message)

    return msg_to_dict(msg)
