"""
Templated B2B outreach email sequences via SendGrid.

Mirrors the `_send_tracked` pattern in services/email_service.py (plain module-level
functions, not classes; returns success/message-id/error so callers can log a
LeadActivity) with three additions required for cold B2B outreach specifically:

1. A PERSISTENT suppression list (models.LeadEmailSuppression) checked before every
   send, in ADDITION to the allowlist lockdown in services/allowlist.py — both gates
   must pass. Suppression is the CAN-SPAM-required mechanism that has to hold even if
   the allowlist is ever opened up for real sends.
2. A real `List-Unsubscribe` header (+ List-Unsubscribe-Post for one-click, RFC 8058)
   and a working, token-based unsubscribe link on every templated email.
3. A simple in-process rate limiter on sends, matching the style of
   services/rate_limit.py.
"""
import os
import time
import hmac
import base64
import hashlib
import asyncio
import logging
from collections import deque
from datetime import datetime

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.allowlist import is_email_allowed, log_blocked
from services.lead_activity import log_activity
from models import Lead, LeadEmailSuppression

logger = logging.getLogger(__name__)

FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "hello@stayvoo.com")
FROM_NAME = "Stayvoo B2B Partnerships"
API_BASE_URL = os.getenv("API_BASE_URL", "https://stayvoo.com")

# ─── Rate limiting (in-process, single-instance — matches services/rate_limit.py) ───

_SEND_WINDOW_SECONDS = 60
_MAX_SENDS_PER_WINDOW = 20
_send_hits: deque[float] = deque()


def _rate_limit_ok() -> bool:
    now = time.time()
    cutoff = now - _SEND_WINDOW_SECONDS
    while _send_hits and _send_hits[0] < cutoff:
        _send_hits.popleft()
    if len(_send_hits) >= _MAX_SENDS_PER_WINDOW:
        logger.warning(
            "Lead outreach rate limit hit (%d sends in %ds window)",
            len(_send_hits), _SEND_WINDOW_SECONDS,
        )
        return False
    _send_hits.append(now)
    return True


# ─── Unsubscribe tokens (HMAC-signed, opaque — not a guessable id) ──────────────

def _unsub_secret() -> bytes:
    # Prefer a dedicated secret; fall back to ADMIN_PASSWORD (guaranteed set — the app
    # refuses to start without it, see services/admin_auth.py) so this pipeline never
    # blocks app startup over a *new* env var not being configured yet.
    secret = os.getenv("LEADS_UNSUBSCRIBE_SECRET") or os.getenv("ADMIN_PASSWORD") or ""
    if not secret:
        logger.warning("No LEADS_UNSUBSCRIBE_SECRET or ADMIN_PASSWORD set — unsubscribe tokens are insecure")
        secret = "stayvoo-leads-insecure-dev-fallback"
    return secret.encode()


def generate_unsubscribe_token(email: str) -> str:
    email_norm = (email or "").strip().lower()
    payload = base64.urlsafe_b64encode(email_norm.encode()).decode().rstrip("=")
    sig = hmac.new(_unsub_secret(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    return f"{payload}.{sig}"


def verify_unsubscribe_token(token: str) -> str | None:
    """Returns the email the token was issued for, or None if invalid/tampered."""
    if not token or "." not in token:
        return None
    payload, _, sig = token.partition(".")
    expected = hmac.new(_unsub_secret(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    if not hmac.compare_digest(sig, expected):
        return None
    padded = payload + "=" * (-len(payload) % 4)
    try:
        return base64.urlsafe_b64decode(padded.encode()).decode()
    except Exception:
        return None


def unsubscribe_url_for(email: str) -> str:
    token = generate_unsubscribe_token(email)
    return f"{API_BASE_URL}/leads/unsubscribe?token={token}"


# ─── Templates ──────────────────────────────────────────────────────────────

BRAND_COLOR = "#1e3a5f"
ACCENT_COLOR = "#f97316"


def _wrap_html(body: str, unsubscribe_url: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:{BRAND_COLOR};padding:24px 32px;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:900;">Stayvoo for Business</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
            {body}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 8px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">
              Stayvoo · Milwaukee Area, WI ·
              <a href="{unsubscribe_url}" style="color:#94a3b8;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _tmpl_intro(lead: Lead, unsubscribe_url: str) -> tuple[str, str]:
    first = (lead.contact_name or "there").split(" ")[0]
    subject = f"Group housing for {lead.company_name}'s crews near Milwaukee/Chicago"
    body = f"""
    <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hi {first},</p>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
      We work with {lead.industry or 'companies like ' + lead.company_name} that regularly need multiple
      hotel rooms booked for weeks at a time around Milwaukee, Waukesha, Brookfield, and Chicagoland.
      We negotiate group/extended-stay rates directly with our partner hotels — typically well below
      standard OTA pricing — and handle the coordination for you.
    </p>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
      Worth a quick call to see if it's a fit for {lead.company_name}?
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="tel:+18883528151" style="display:inline-block;background:{ACCENT_COLOR};color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;">
        Call +1 (888) 352-8151
      </a>
    </div>
    <p style="margin:0;color:#64748b;font-size:13px;">— The Stayvoo Team</p>"""
    return subject, _wrap_html(body, unsubscribe_url)


def _tmpl_followup_1(lead: Lead, unsubscribe_url: str) -> tuple[str, str]:
    first = (lead.contact_name or "there").split(" ")[0]
    subject = f"Following up — extended-stay rooms for {lead.company_name}"
    body = f"""
    <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hi {first},</p>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
      Circling back on group/extended-stay housing near Milwaukee and Chicagoland for
      {lead.company_name}. If timing's off, no worries — happy to reconnect whenever
      your next project or placement wave comes up.
    </p>
    <p style="margin:0;color:#64748b;font-size:13px;">— The Stayvoo Team</p>"""
    return subject, _wrap_html(body, unsubscribe_url)


def _tmpl_case_study(lead: Lead, unsubscribe_url: str) -> tuple[str, str]:
    first = (lead.contact_name or "there").split(" ")[0]
    subject = "How we house rotating crews for a Milwaukee-area contractor"
    body = f"""
    <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hi {first},</p>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
      A quick example of how this works in practice: we keep a standing block of rooms
      with partner hotels near Waukesha/Brookfield for companies with rotating field
      staff, so a new crew can check in same-day without a rate negotiation every time.
    </p>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
      Happy to set something similar up for {lead.company_name} — reply here or call
      +1 (888) 352-8151.
    </p>
    <p style="margin:0;color:#64748b;font-size:13px;">— The Stayvoo Team</p>"""
    return subject, _wrap_html(body, unsubscribe_url)


TEMPLATES = {
    "intro": _tmpl_intro,
    "followup_1": _tmpl_followup_1,
    "case_study": _tmpl_case_study,
}


def render_template(template_key: str, lead: Lead, unsubscribe_url: str) -> tuple[str, str]:
    fn = TEMPLATES.get(template_key)
    if not fn:
        raise ValueError(f"Unknown lead email template_key: {template_key!r}")
    return fn(lead, unsubscribe_url)


# ─── Suppression list ───────────────────────────────────────────────────────

async def is_suppressed(db: AsyncSession, email: str) -> bool:
    if not email:
        return True
    result = await db.execute(
        select(LeadEmailSuppression).where(LeadEmailSuppression.email == email.strip().lower())
    )
    return result.scalars().first() is not None


async def add_suppression(db: AsyncSession, email: str, reason: str) -> LeadEmailSuppression:
    email_norm = email.strip().lower()
    existing = await db.execute(
        select(LeadEmailSuppression).where(LeadEmailSuppression.email == email_norm)
    )
    row = existing.scalars().first()
    if row:
        return row
    import uuid
    row = LeadEmailSuppression(id=uuid.uuid4(), email=email_norm, reason=reason)
    db.add(row)
    await db.flush()
    return row


# ─── Send ───────────────────────────────────────────────────────────────────

def _send_lead_email_sync(to_email: str, subject: str, html: str, unsubscribe_url: str) -> dict:
    """Allowlist check happens here, at the point of the actual SendGrid call — same
    guarantee as email_service.py's _send_tracked_sync. Suppression is checked by the
    caller (send_lead_outreach_email) before this is ever reached."""
    if not is_email_allowed(to_email):
        log_blocked("email", to_email, subject)
        return {"success": False, "message_id": None, "error": "Recipient blocked by allowlist lockdown"}

    api_key = os.getenv("SENDGRID_API_KEY")
    if not api_key:
        return {"success": False, "message_id": None, "error": "SENDGRID_API_KEY is not configured"}

    message = Mail(
        from_email=(FROM_EMAIL, FROM_NAME),
        to_emails=to_email,
        subject=subject,
        html_content=html,
    )
    message.add_header(Header("List-Unsubscribe", f"<{unsubscribe_url}>"))
    message.add_header(Header("List-Unsubscribe-Post", "List-Unsubscribe=One-Click"))

    try:
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        message_id = response.headers.get("X-Message-Id") if response.headers else None
        if response.status_code >= 400:
            return {"success": False, "message_id": message_id, "error": f"SendGrid returned status {response.status_code}"}
        logger.info("Lead outreach email sent to %s: %s (status %s, id %s)", to_email, subject, response.status_code, message_id)
        return {"success": True, "message_id": message_id, "error": None}
    except Exception as e:
        logger.error("Lead outreach email failed to %s: %s", to_email, e)
        return {"success": False, "message_id": None, "error": str(e)}


async def send_lead_outreach_email(
    db: AsyncSession,
    lead: Lead,
    template_key: str,
    actor: str = "system",
) -> dict:
    """Full gated send: suppression check -> allowlist check (inside the actual send
    call) -> rate limit -> SendGrid -> LeadActivity log. Caller is responsible for
    db.commit() (matches the rest of this codebase's "add, caller commits" convention)."""
    email = (lead.contact_email or "").strip().lower()

    if not email:
        await log_activity(db, lead.id, "send_failed_retry", actor, "No contact_email on lead")
        return {"success": False, "message_id": None, "error": "Lead has no contact_email"}

    if await is_suppressed(db, email):
        await log_activity(db, lead.id, "email_suppressed", actor, f"template={template_key}, recipient on suppression list")
        return {"success": False, "message_id": None, "error": "Recipient is on the suppression list"}

    if not _rate_limit_ok():
        await log_activity(db, lead.id, "send_failed_retry", actor, f"template={template_key}, rate limited")
        return {"success": False, "message_id": None, "error": "Rate limit exceeded, try again shortly"}

    try:
        unsubscribe_url = unsubscribe_url_for(email)
        subject, html = render_template(template_key, lead, unsubscribe_url)
    except ValueError as e:
        await log_activity(db, lead.id, "send_failed_retry", actor, str(e))
        return {"success": False, "message_id": None, "error": str(e)}

    result = await asyncio.to_thread(_send_lead_email_sync, email, subject, html, unsubscribe_url)

    if result["success"]:
        await log_activity(
            db, lead.id, "email_sent", actor,
            f"template={template_key} message_id={result['message_id']}",
        )
    else:
        # Allowlist blocks are logged distinctly from generic send failures so they're
        # easy to tell apart in the activity trail.
        if result["error"] == "Recipient blocked by allowlist lockdown":
            await log_activity(db, lead.id, "send_failed_retry", actor, f"template={template_key}, blocked by allowlist")
        else:
            await log_activity(db, lead.id, "send_failed_retry", actor, f"template={template_key}, error={result['error']}")

    return result
