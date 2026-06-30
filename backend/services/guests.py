import secrets
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import Guest


async def get_or_create_guest(
    db: AsyncSession,
    email: str,
    first_name: str,
    last_name: str,
    phone: str,
) -> Guest:
    result = await db.execute(select(Guest).where(Guest.email == email))
    guest = result.scalar_one_or_none()
    if guest:
        if first_name:
            guest.first_name = first_name
        if last_name:
            guest.last_name = last_name
        if phone:
            guest.phone = phone
        if not guest.access_token:
            guest.access_token = secrets.token_urlsafe(32)
            guest.token_expires_at = datetime.utcnow() + timedelta(days=30)
        await db.flush()
        return guest

    guest = Guest(
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        access_token=secrets.token_urlsafe(32),
        token_expires_at=datetime.utcnow() + timedelta(days=30),
    )
    db.add(guest)
    await db.flush()
    return guest


def issue_new_token(guest: Guest) -> str:
    """Generate + set a new token on the guest object. Caller must commit."""
    token = secrets.token_urlsafe(32)
    guest.access_token = token
    guest.token_expires_at = datetime.utcnow() + timedelta(days=30)
    return token


def extend_token(guest: Guest) -> None:
    """Slide the expiry 30 days without changing the token. Caller must commit."""
    guest.token_expires_at = datetime.utcnow() + timedelta(days=30)
