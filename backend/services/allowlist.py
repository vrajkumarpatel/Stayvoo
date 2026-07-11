"""
Outbound-comms lockdown: while this is in effect, email/SMS can only reach
the developer, never a real guest or hotel. Hardcoded per explicit instruction —
this stays in place until told otherwise, so it is not env-var-configurable.
"""
import re
import logging

logger = logging.getLogger(__name__)

ALLOWED_EMAILS = {"vp431030@gmail.com"}
ALLOWED_PHONES = {"7472445131"}  # compared against the last 10 digits


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
