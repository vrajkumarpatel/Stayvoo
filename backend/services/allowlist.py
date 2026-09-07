"""
Outbound-comms lockdown: while this is in effect, email/SMS can only reach
addresses/numbers listed in ALLOWLIST_EMAILS/ALLOWLIST_PHONES, never a real
guest or hotel. Configured via env vars; if unset, nothing is allowed through
(fails closed, not open).
"""
import os
import re
import logging

logger = logging.getLogger(__name__)


def _parse_list(env_value: str | None) -> set[str]:
    if not env_value:
        return set()
    return {item.strip() for item in env_value.split(",") if item.strip()}


ALLOWED_EMAILS = {e.lower() for e in _parse_list(os.getenv("ALLOWLIST_EMAILS"))}
ALLOWED_PHONES = _parse_list(os.getenv("ALLOWLIST_PHONES"))  # compared against the last 10 digits


def _normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    return digits[-10:]


def is_email_allowed(email: str | None) -> bool:
    if not email:
        return False
    return email.strip().lower() in ALLOWED_EMAILS


def is_sms_allowed(phone: str | None) -> bool:
    if not phone:
        return False
    return _normalize_phone(phone) in ALLOWED_PHONES


def log_blocked(kind: str, recipient: str | None, context: str = "") -> None:
    logger.warning(
        "BLOCKED outbound %s to %r (allowlist lockdown active)%s",
        kind, recipient, f" — {context}" if context else "",
    )
