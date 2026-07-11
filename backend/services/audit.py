import uuid
from models import AuditLog


async def record_change(db, entity_type: str, entity_id, changes: dict, changed_by: str = "admin") -> None:
    """changes: {field: (old_value, new_value)}. Only writes rows where old != new.
    Caller is responsible for committing (this just adds to the session)."""
    for field, (old_value, new_value) in changes.items():
        if old_value == new_value:
            continue
        db.add(AuditLog(
            id=uuid.uuid4(),
            entity_type=entity_type,
            entity_id=entity_id if isinstance(entity_id, uuid.UUID) else uuid.UUID(str(entity_id)),
            field=field,
            old_value=None if old_value is None else str(old_value),
            new_value=None if new_value is None else str(new_value),
            changed_by=changed_by,
        ))
