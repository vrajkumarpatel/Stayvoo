"""
Small helper to log LeadActivity rows consistently, so every service/router that
touches a Lead doesn't repeat the same SQLAlchemy insert boilerplate.

Matches the existing services/audit.py convention: this only calls db.add(), it does
NOT commit — the caller controls the transaction boundary.
"""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from models import LeadActivity


async def log_activity(
    db: AsyncSession,
    lead_id,
    action: str,
    actor: str = "system",
    detail: str | None = None,
) -> LeadActivity:
    activity = LeadActivity(
        id=uuid.uuid4(),
        lead_id=lead_id if isinstance(lead_id, uuid.UUID) else uuid.UUID(str(lead_id)),
        action=action,
        actor=actor,
        detail=detail,
    )
    db.add(activity)
    await db.flush()
    return activity
