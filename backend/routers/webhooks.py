import os
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import HotelInvoice

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _verify_signature(raw_body: bytes, headers: dict) -> bool:
    """Verify SendGrid's Ed25519 Signed Event Webhook, if a verification key is configured.
    Returns True if verification is skipped (key not configured) or passes; False if it fails."""
    public_key = os.getenv("SENDGRID_WEBHOOK_VERIFICATION_KEY")
    if not public_key:
        logger.warning("SENDGRID_WEBHOOK_VERIFICATION_KEY not set — accepting webhook unverified")
        return True

    signature = headers.get("x-twilio-email-event-webhook-signature")
    timestamp = headers.get("x-twilio-email-event-webhook-timestamp")
    if not signature or not timestamp:
        return False

    try:
        from sendgrid.helpers.eventwebhook import EventWebhook
        ew = EventWebhook()
        ec_public_key = ew.convert_public_key_to_ecdsa(public_key)
        return ew.verify_signature(raw_body.decode(), signature, timestamp, ec_public_key)
    except Exception as e:
        logger.error("SendGrid webhook signature verification failed: %s", e)
        return False


@router.post("/sendgrid")
async def sendgrid_event_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    raw_body = await request.body()

    if not _verify_signature(raw_body, dict(request.headers)):
        return {"status": "rejected", "reason": "invalid signature"}

    events = await request.json()
    if not isinstance(events, list):
        events = [events]

    for event in events:
        message_id = event.get("sg_message_id", "").split(".")[0]
        event_type = event.get("event")
        if not message_id or not event_type:
            continue

        result = await db.execute(
            select(HotelInvoice).where(HotelInvoice.sendgrid_message_id.like(f"{message_id}%"))
        )
        invoice = result.scalar_one_or_none()
        if not invoice:
            continue

        ts = datetime.utcfromtimestamp(event["timestamp"]) if event.get("timestamp") else datetime.utcnow()
        if event_type == "delivered":
            invoice.delivery_status = "delivered"
            invoice.delivered_at = ts
        elif event_type == "open":
            invoice.opened_at = ts
        elif event_type in ("bounce", "dropped"):
            invoice.delivery_status = "bounced"
            invoice.bounced_at = ts

    await db.commit()

    return {"status": "ok"}
