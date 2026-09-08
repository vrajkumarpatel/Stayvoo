"""
B2B lead-generation and tracking pipeline endpoints.

Three auth models on this one router, matched to who calls each group of routes:
- Inbound webhook intake: a shared secret header (X-Webhook-Secret / LEADS_WEBHOOK_SECRET),
  NOT the interactive admin password — this is machine-to-machine (n8n / external forms).
- Admin CRUD/actions: the existing `_verify_admin` dependency (X-Admin-Password header),
  same as every other admin route in this codebase.
- Public unsubscribe: token-only, no auth beyond the signed token itself (CAN-SPAM).
"""
import os
import uuid
import secrets
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Lead, LeadActivity, LeadFollowUp
from services.admin_auth import verify_admin as _verify_admin
from services.lead_activity import log_activity
from services.lead_dedup import find_duplicate_lead, normalize_domain
from services.lead_scoring import score_lead
from services.lead_outreach import (
    send_lead_outreach_email,
    add_suppression,
    verify_unsubscribe_token,
    TEMPLATES,
)
from services import apollo_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/leads", tags=["leads"])


# ─── Webhook auth (machine-to-machine, not the admin password) ─────────────────

def _verify_webhook_secret(x_webhook_secret: str = Header(...)) -> None:
    configured = os.getenv("LEADS_WEBHOOK_SECRET")
    if not configured:
        # Fail closed: an unconfigured secret means the webhook is not usable, not
        # that it's open to anyone.
        logger.warning("LEADS_WEBHOOK_SECRET not set — rejecting all lead webhook intake")
        raise HTTPException(status_code=401, detail="Lead webhook is not configured")
    if not secrets.compare_digest(x_webhook_secret, configured):
        raise HTTPException(status_code=401, detail="Invalid webhook secret")


# ─── Serialization ──────────────────────────────────────────────────────────

def lead_to_dict(lead: Lead) -> dict:
    return {
        "id": str(lead.id),
        "company_name": lead.company_name,
        "domain": lead.domain,
        "industry": lead.industry,
        "company_size": lead.company_size,
        "city": lead.city,
        "state": lead.state,
        "source": lead.source,
        "status": lead.status,
        "score": lead.score,
        "tier": lead.tier,
        "score_reasoning": lead.score_reasoning,
        "contact_name": lead.contact_name,
        "contact_email": lead.contact_email,
        "contact_title": lead.contact_title,
        "contact_phone": lead.contact_phone,
        "apollo_id": lead.apollo_id,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
        "updated_at": lead.updated_at.isoformat() if lead.updated_at else None,
    }


def activity_to_dict(a: LeadActivity) -> dict:
    return {
        "id": str(a.id),
        "lead_id": str(a.lead_id),
        "action": a.action,
        "actor": a.actor,
        "detail": a.detail,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def followup_to_dict(f: LeadFollowUp) -> dict:
    return {
        "id": str(f.id),
        "lead_id": str(f.lead_id),
        "scheduled_for": f.scheduled_for.isoformat() if f.scheduled_for else None,
        "template_key": f.template_key,
        "status": f.status,
        "retry_count": f.retry_count,
        "last_error": f.last_error,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }


async def _load_lead(lead_id: str, db: AsyncSession) -> Lead:
    try:
        lead_uuid = uuid.UUID(lead_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid lead id")
    result = await db.execute(select(Lead).where(Lead.id == lead_uuid))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


# ─── Background scoring ──────────────────────────────────────────────────────

async def _score_lead_background(lead_id) -> None:
    """Opens its own DB session — matches the pattern used by main.py's scheduled
    jobs (_daily_pre_arrival_job etc.), since this runs outside the request's session.
    `_AsyncSessionLocal` is imported here (not at module load time) because it's a
    module-level global in database.py that's None until setup_db() runs in the
    app's lifespan — importing it at the top of this module would bind the stale
    pre-lifespan None."""
    from database import _AsyncSessionLocal
    async with _AsyncSessionLocal() as session:
        result = await session.execute(select(Lead).where(Lead.id == lead_id))
        lead = result.scalar_one_or_none()
        if not lead:
            return
        try:
            score_result = await score_lead({
                "company_name": lead.company_name,
                "industry": lead.industry,
                "company_size": lead.company_size,
                "city": lead.city,
                "state": lead.state,
            })
            lead.score = score_result["score"]
            lead.tier = score_result["tier"]
            lead.score_reasoning = score_result["reasoning"]
            await log_activity(
                session, lead.id, "scored", "system",
                f"tier={score_result['tier']} score={score_result['score']}",
            )
            await session.commit()
        except Exception as e:
            logger.error("Background scoring failed for lead %s: %s", lead_id, e)


# ─── Inbound webhook intake (n8n / external forms) ──────────────────────────

class LeadWebhookIn(BaseModel):
    company_name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_title: Optional[str] = None
    contact_phone: Optional[str] = None
    source: str = "webhook"


@router.post("/webhook")
async def leads_webhook_intake(
    payload: LeadWebhookIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_webhook_secret),
):
    if not payload.company_name or not payload.company_name.strip():
        raise HTTPException(status_code=422, detail="company_name is required")

    duplicate = await find_duplicate_lead(db, payload.company_name, payload.domain)
    if duplicate:
        return {"status": "duplicate", "lead": lead_to_dict(duplicate)}

    lead = Lead(
        id=uuid.uuid4(),
        company_name=payload.company_name.strip(),
        domain=normalize_domain(payload.domain),
        industry=payload.industry,
        company_size=payload.company_size,
        city=payload.city,
        state=payload.state,
        source=payload.source or "webhook",
        contact_name=payload.contact_name,
        contact_email=(payload.contact_email or "").strip().lower() or None,
        contact_title=payload.contact_title,
        contact_phone=payload.contact_phone,
    )
    db.add(lead)
    await db.flush()
    await log_activity(db, lead.id, "created", "system", f"source={lead.source}")
    await db.commit()
    await db.refresh(lead)

    background_tasks.add_task(_score_lead_background, lead.id)

    return {"status": "created", "lead": lead_to_dict(lead)}


# ─── Public unsubscribe (token-only, CAN-SPAM) ──────────────────────────────

@router.get("/unsubscribe", response_class=HTMLResponse)
@router.post("/unsubscribe", response_class=HTMLResponse)
async def unsubscribe(token: str, db: AsyncSession = Depends(get_db)):
    email = verify_unsubscribe_token(token)
    if not email:
        return HTMLResponse("<h1>Invalid or expired unsubscribe link.</h1>", status_code=400)

    await add_suppression(db, email, reason="unsubscribed")

    result = await db.execute(select(Lead).where(func.lower(Lead.contact_email) == email))
    for lead in result.scalars().all():
        await log_activity(db, lead.id, "email_suppressed", "system", "Recipient unsubscribed via link")
    await db.commit()

    return HTMLResponse(
        "<h1>You've been unsubscribed.</h1><p>You will not receive further emails from Stayvoo at this address.</p>"
    )


# ─── Admin: CRUD / list / detail ────────────────────────────────────────────

class LeadCreateIn(BaseModel):
    company_name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_title: Optional[str] = None
    contact_phone: Optional[str] = None


@router.post("")
async def create_lead(
    payload: LeadCreateIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    duplicate = await find_duplicate_lead(db, payload.company_name, payload.domain)
    if duplicate:
        raise HTTPException(status_code=409, detail={"message": "Duplicate lead", "lead": lead_to_dict(duplicate)})

    lead = Lead(
        id=uuid.uuid4(),
        company_name=payload.company_name.strip(),
        domain=normalize_domain(payload.domain),
        industry=payload.industry,
        company_size=payload.company_size,
        city=payload.city,
        state=payload.state,
        source="manual",
        contact_name=payload.contact_name,
        contact_email=(payload.contact_email or "").strip().lower() or None,
        contact_title=payload.contact_title,
        contact_phone=payload.contact_phone,
    )
    db.add(lead)
    await db.flush()
    await log_activity(db, lead.id, "created", "admin", "source=manual")
    await db.commit()
    await db.refresh(lead)

    background_tasks.add_task(_score_lead_background, lead.id)
    return lead_to_dict(lead)


@router.get("")
async def list_leads(
    status: Optional[str] = None,
    tier: Optional[str] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    q = select(Lead).order_by(Lead.created_at.desc())
    if status:
        q = q.where(Lead.status == status)
    if tier:
        q = q.where(Lead.tier == tier)
    if source:
        q = q.where(Lead.source == source)
    result = await db.execute(q)
    leads = result.scalars().all()

    if search:
        s = search.lower()
        leads = [
            l for l in leads
            if s in (l.company_name or "").lower()
            or s in (l.domain or "").lower()
            or s in (l.contact_name or "").lower()
            or s in (l.contact_email or "").lower()
        ]

    return [lead_to_dict(l) for l in leads]


@router.get("/funnel/summary")
async def funnel_summary(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    result = await db.execute(select(Lead.status, func.count()).group_by(Lead.status))
    counts = {status: count for status, count in result.all()}
    total = sum(counts.values())
    return {"total": total, "by_status": counts}


@router.get("/{lead_id}")
async def get_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    lead = await _load_lead(lead_id, db)
    act_result = await db.execute(
        select(LeadActivity).where(LeadActivity.lead_id == lead.id).order_by(LeadActivity.created_at.desc())
    )
    fu_result = await db.execute(
        select(LeadFollowUp).where(LeadFollowUp.lead_id == lead.id).order_by(LeadFollowUp.scheduled_for.asc())
    )
    data = lead_to_dict(lead)
    data["activities"] = [activity_to_dict(a) for a in act_result.scalars().all()]
    data["followups"] = [followup_to_dict(f) for f in fu_result.scalars().all()]
    return data


class LeadUpdateIn(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_title: Optional[str] = None
    contact_phone: Optional[str] = None


@router.put("/{lead_id}")
async def update_lead(
    lead_id: str,
    payload: LeadUpdateIn,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    lead = await _load_lead(lead_id, db)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(lead, field, value)
    lead.updated_at = datetime.utcnow()
    await log_activity(db, lead.id, "note_added", "admin", f"Fields updated: {', '.join(updates.keys())}" if updates else "No-op update")
    await db.commit()
    await db.refresh(lead)
    return lead_to_dict(lead)


class StatusUpdateIn(BaseModel):
    status: str


@router.post("/{lead_id}/status")
async def update_lead_status(
    lead_id: str,
    payload: StatusUpdateIn,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    valid_statuses = {"new", "contacted", "responded", "qualified", "closed", "lost"}
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=422, detail=f"status must be one of {sorted(valid_statuses)}")

    lead = await _load_lead(lead_id, db)
    old_status = lead.status
    lead.status = payload.status
    lead.updated_at = datetime.utcnow()
    await log_activity(db, lead.id, "status_changed", "admin", f"{old_status} -> {payload.status}")
    await db.commit()
    await db.refresh(lead)
    return lead_to_dict(lead)


class NoteIn(BaseModel):
    note: str


@router.post("/{lead_id}/notes")
async def add_note(
    lead_id: str,
    payload: NoteIn,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    lead = await _load_lead(lead_id, db)
    activity = await log_activity(db, lead.id, "note_added", "admin", payload.note)
    await db.commit()
    await db.refresh(activity)
    return activity_to_dict(activity)


# ─── Admin: outreach ─────────────────────────────────────────────────────────

class SendEmailIn(BaseModel):
    template_key: str


@router.post("/{lead_id}/send-email")
async def send_email(
    lead_id: str,
    payload: SendEmailIn,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    if payload.template_key not in TEMPLATES:
        raise HTTPException(status_code=422, detail=f"template_key must be one of {sorted(TEMPLATES.keys())}")
    lead = await _load_lead(lead_id, db)
    result = await send_lead_outreach_email(db, lead, payload.template_key, actor="admin")
    if lead.status == "new" and result["success"]:
        lead.status = "contacted"
        lead.updated_at = datetime.utcnow()
    await db.commit()
    return result


class ScheduleFollowUpIn(BaseModel):
    scheduled_for: datetime
    template_key: str


@router.post("/{lead_id}/schedule-followup")
async def schedule_followup(
    lead_id: str,
    payload: ScheduleFollowUpIn,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    if payload.template_key not in TEMPLATES:
        raise HTTPException(status_code=422, detail=f"template_key must be one of {sorted(TEMPLATES.keys())}")
    lead = await _load_lead(lead_id, db)

    followup = LeadFollowUp(
        id=uuid.uuid4(),
        lead_id=lead.id,
        scheduled_for=payload.scheduled_for,
        template_key=payload.template_key,
    )
    db.add(followup)
    await db.flush()
    await log_activity(
        db, lead.id, "followup_scheduled", "admin",
        f"template={payload.template_key} scheduled_for={payload.scheduled_for.isoformat()}",
    )
    await db.commit()
    await db.refresh(followup)
    return followup_to_dict(followup)


@router.post("/{lead_id}/retry-failed-send")
async def retry_failed_send(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    lead = await _load_lead(lead_id, db)
    fu_result = await db.execute(
        select(LeadFollowUp)
        .where(LeadFollowUp.lead_id == lead.id, LeadFollowUp.status == "failed")
        .order_by(LeadFollowUp.scheduled_for.desc())
    )
    followup = fu_result.scalars().first()
    if not followup:
        raise HTTPException(status_code=404, detail="No failed follow-up to retry for this lead")

    result = await send_lead_outreach_email(db, lead, followup.template_key, actor="admin")
    followup.retry_count = (followup.retry_count or 0) + 1
    if result["success"]:
        followup.status = "sent"
        followup.last_error = None
        await log_activity(db, lead.id, "followup_sent", "admin", f"retry #{followup.retry_count}, template={followup.template_key}")
    else:
        followup.last_error = result["error"]
        await log_activity(db, lead.id, "send_failed_retry", "admin", f"retry #{followup.retry_count} failed: {result['error']}")
    await db.commit()
    await db.refresh(followup)
    return followup_to_dict(followup)


# ─── Admin: follow-up dispatch (for the n8n cron dispatcher) ────────────────

@router.get("/followups/due")
async def list_due_followups(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    now = datetime.utcnow()
    result = await db.execute(
        select(LeadFollowUp)
        .where(LeadFollowUp.status == "pending", LeadFollowUp.scheduled_for <= now)
        .order_by(LeadFollowUp.scheduled_for.asc())
    )
    return [followup_to_dict(f) for f in result.scalars().all()]


@router.post("/followups/dispatch")
async def dispatch_due_followups(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    """Sends every LeadFollowUp that's due. Called by the n8n follow-up-dispatcher
    workflow on a cron schedule."""
    now = datetime.utcnow()
    result = await db.execute(
        select(LeadFollowUp)
        .where(LeadFollowUp.status == "pending", LeadFollowUp.scheduled_for <= now)
        .order_by(LeadFollowUp.scheduled_for.asc())
    )
    due = result.scalars().all()

    sent, failed = 0, 0
    for followup in due:
        lead_result = await db.execute(select(Lead).where(Lead.id == followup.lead_id))
        lead = lead_result.scalar_one_or_none()
        if not lead:
            followup.status = "cancelled"
            followup.last_error = "Lead no longer exists"
            continue

        send_result = await send_lead_outreach_email(db, lead, followup.template_key, actor="system")
        if send_result["success"]:
            followup.status = "sent"
            followup.last_error = None
            sent += 1
            await log_activity(db, lead.id, "followup_sent", "system", f"template={followup.template_key}")
        else:
            followup.status = "failed"
            followup.last_error = send_result["error"]
            followup.retry_count = (followup.retry_count or 0) + 1
            failed += 1

    await db.commit()
    return {"processed": len(due), "sent": sent, "failed": failed}


# ─── Admin: Apollo sync ───────────────────────────────────────────────────────

class ApolloSyncIn(BaseModel):
    industries: Optional[list[str]] = None
    locations: Optional[list[str]] = None
    per_page: int = 10


@router.post("/apollo-sync")
async def apollo_sync(
    payload: ApolloSyncIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_admin),
):
    companies = await apollo_client.search_companies(payload.industries, payload.locations, payload.per_page)

    created, duplicates = [], []
    for company in companies:
        duplicate = await find_duplicate_lead(db, company.get("company_name"), company.get("domain"))
        if duplicate:
            duplicates.append(lead_to_dict(duplicate))
            continue

        lead = Lead(
            id=uuid.uuid4(),
            company_name=company.get("company_name") or "Unknown Company",
            domain=normalize_domain(company.get("domain")),
            industry=company.get("industry"),
            company_size=company.get("company_size"),
            city=company.get("city"),
            state=company.get("state"),
            source="apollo",
            contact_name=company.get("contact_name"),
            contact_email=(company.get("contact_email") or "").strip().lower() or None,
            contact_title=company.get("contact_title"),
            contact_phone=company.get("contact_phone"),
            apollo_id=company.get("apollo_id"),
        )
        db.add(lead)
        await db.flush()
        await log_activity(db, lead.id, "created", "system", "source=apollo")
        created.append(lead)

    await db.commit()
    for lead in created:
        await db.refresh(lead)
        background_tasks.add_task(_score_lead_background, lead.id)

    return {
        "created": [lead_to_dict(l) for l in created],
        "duplicates_skipped": duplicates,
        "created_count": len(created),
        "duplicates_skipped_count": len(duplicates),
    }
