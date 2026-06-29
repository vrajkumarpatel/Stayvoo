import os
import logging
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

FROM_NAME = "Stayvoo"
SUPPORT_PHONE = "+18883528151"
BRAND_COLOR = "#1e3a5f"
ACCENT_COLOR = "#f97316"


def _base_html(title: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:{BRAND_COLOR};padding:24px 32px;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">Stayvoo</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">{title}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
            {body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 0;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              Stayvoo · Waukesha &amp; Brookfield, WI ·
              <a href="tel:{SUPPORT_PHONE}" style="color:#94a3b8;">{SUPPORT_PHONE}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _booking_summary_rows(b: dict) -> str:
    hotel = b.get("hotel") or {}
    room = b.get("room") or {}
    rows = [
        ("Hotel", hotel.get("name", "—")),
        ("Room", room.get("name", "—")),
        ("Check-in", b.get("checkin_date", "—")),
        ("Check-out", b.get("checkout_date", "—")),
        ("Nights", str(b.get("nights", "—"))),
        ("Total", f"${float(b.get('total_amount', 0)):.0f} (due at hotel)"),
    ]
    html = ""
    for label, value in rows:
        html += f"""
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;width:40%;">{label}</td>
          <td style="padding:8px 0;color:{BRAND_COLOR};font-size:14px;font-weight:600;border-bottom:1px solid #f1f5f9;">{value}</td>
        </tr>"""
    return html


def _ref_badge(ref: str) -> str:
    return f"""
    <div style="text-align:center;margin:20px 0;">
      <div style="display:inline-block;background:#fff7ed;border:2px solid #fed7aa;border-radius:12px;padding:12px 28px;">
        <span style="color:{ACCENT_COLOR};font-size:24px;font-weight:900;letter-spacing:2px;">{ref}</span>
      </div>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;">Save this reference number</p>
    </div>"""


async def _send(to_email: str, subject: str, html: str) -> None:
    smtp_user = os.getenv("GMAIL_USER")
    smtp_pass = os.getenv("GMAIL_APP_PASSWORD")
    if not smtp_user or not smtp_pass:
        logger.warning("SMTP credentials not set — skipping email to %s", to_email)
        return
    smtp_host = os.getenv("SMTP_HOST", "mail.privateemail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{smtp_user}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))
    try:
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_pass,
            start_tls=True,
        )
        logger.info("Email sent to %s: %s", to_email, subject)
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e)


async def send_booking_received(b: dict) -> None:
    guest = b.get("guest") or {}
    to_email = guest.get("email")
    if not to_email:
        return
    first = guest.get("first_name", "there")
    ref = b.get("booking_ref", "")
    body = f"""
    <h2 style="margin:0 0 6px;color:{BRAND_COLOR};font-size:20px;font-weight:900;">Hi {first}, we got your request!</h2>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      Your booking request has been received. We're personally contacting the hotel right now
      to secure your exact room and any special requests.
    </p>
    {_ref_badge(ref)}
    <h3 style="margin:24px 0 8px;color:{BRAND_COLOR};font-size:15px;">Booking Details</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
      {_booking_summary_rows(b)}
    </table>
    <div style="margin-top:24px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;">
      <p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">
        ✅ Expect a confirmation text within 30 minutes.
      </p>
      <p style="margin:6px 0 0;color:#166534;font-size:13px;">
        Questions? Call or text us at <strong>{SUPPORT_PHONE}</strong>
      </p>
    </div>"""
    await _send(to_email, f"Booking Request Received — {ref}", _base_html("Booking Received", body))


async def send_booking_confirmed(b: dict) -> None:
    guest = b.get("guest") or {}
    to_email = guest.get("email")
    if not to_email:
        return
    first = guest.get("first_name", "there")
    ref = b.get("booking_ref", "")
    pms = b.get("pms_confirmation") or "—"
    hotel = b.get("hotel") or {}
    body = f"""
    <h2 style="margin:0 0 6px;color:{BRAND_COLOR};font-size:20px;font-weight:900;">You're confirmed, {first}!</h2>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      Your reservation at <strong>{hotel.get('name', '')}</strong> has been confirmed directly with the hotel.
    </p>
    {_ref_badge(ref)}
    <div style="margin:16px 0;background:#fff7ed;border:2px solid #fed7aa;border-radius:10px;padding:14px 20px;">
      <p style="margin:0;color:#9a3412;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Hotel Confirmation Number</p>
      <p style="margin:4px 0 0;color:{ACCENT_COLOR};font-size:22px;font-weight:900;">{pms}</p>
    </div>
    <h3 style="margin:24px 0 8px;color:{BRAND_COLOR};font-size:15px;">Stay Details</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
      {_booking_summary_rows(b)}
    </table>
    <div style="margin-top:24px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;">
      <p style="margin:0;color:#1d4ed8;font-size:14px;font-weight:600;">🎁 Your welcome kit will be waiting at the front desk.</p>
      <p style="margin:6px 0 0;color:#1e40af;font-size:13px;">
        Need anything before you arrive? Call <strong>{SUPPORT_PHONE}</strong>
      </p>
    </div>"""
    await _send(to_email, f"Confirmed! Your Stay at {hotel.get('name', 'Hotel')} — {ref}", _base_html("Booking Confirmed", body))


async def send_pre_arrival_email(b: dict) -> None:
    guest = b.get("guest") or {}
    to_email = guest.get("email")
    if not to_email:
        return
    first = guest.get("first_name", "there")
    hotel = b.get("hotel") or {}
    ref = b.get("booking_ref", "")
    checkin = b.get("checkin_date", "tomorrow")
    body = f"""
    <h2 style="margin:0 0 6px;color:{BRAND_COLOR};font-size:20px;font-weight:900;">See you tomorrow, {first}!</h2>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      Your stay at <strong>{hotel.get('name', '')}</strong> begins on <strong>{checkin}</strong>.
      Everything is confirmed and your welcome kit is ready.
    </p>
    <h3 style="margin:0 0 8px;color:{BRAND_COLOR};font-size:15px;">Quick Reminders</h3>
    <ul style="margin:0 0 20px;padding-left:20px;color:#475569;font-size:14px;line-height:2;">
      <li>Standard check-in is 3PM (early check-in subject to availability)</li>
      <li>Bring a photo ID and the card you'll use to cover incidentals</li>
      <li>Ask the front desk for your Stayvoo welcome kit</li>
      <li>Free parking on site — no validation needed</li>
    </ul>
    <table width="100%" cellpadding="0" cellspacing="0">
      {_booking_summary_rows(b)}
    </table>
    <div style="margin-top:24px;padding:14px 20px;background:#f8fafc;border-radius:10px;border-left:4px solid {ACCENT_COLOR};">
      <p style="margin:0;color:#475569;font-size:13px;">
        Questions or changes? Call or text <strong>{SUPPORT_PHONE}</strong> — we reply fast.
      </p>
    </div>"""
    await _send(to_email, f"Your Stay at {hotel.get('name', 'Hotel')} is Tomorrow — Ref {ref}", _base_html("Pre-Arrival Reminder", body))


async def send_post_stay_email(b: dict) -> None:
    guest = b.get("guest") or {}
    to_email = guest.get("email")
    if not to_email:
        return
    first = guest.get("first_name", "there")
    hotel = b.get("hotel") or {}
    ref = b.get("booking_ref", "")
    body = f"""
    <h2 style="margin:0 0 6px;color:{BRAND_COLOR};font-size:20px;font-weight:900;">Thanks for staying, {first}!</h2>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      We hope you had a great stay at <strong>{hotel.get('name', '')}</strong>.
      It was a pleasure having you as a Stayvoo guest.
    </p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:20px;margin-bottom:20px;text-align:center;">
      <p style="margin:0 0 8px;color:{BRAND_COLOR};font-size:15px;font-weight:700;">How was your stay?</p>
      <p style="margin:0;color:#475569;font-size:13px;">
        Reply to this email or call <strong>{SUPPORT_PHONE}</strong> — your feedback helps us serve you better next time.
      </p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">
      {_booking_summary_rows(b)}
    </table>
    <div style="margin-top:24px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;text-align:center;">
      <p style="margin:0;color:{BRAND_COLOR};font-size:14px;font-weight:700;">Coming back to Waukesha soon?</p>
      <p style="margin:6px 0 0;color:#475569;font-size:13px;">
        Visit <a href="https://stayvoo.com" style="color:{ACCENT_COLOR};font-weight:600;">stayvoo.com</a> — we'll get you the best rate every time.
      </p>
    </div>"""
    await _send(to_email, f"Thanks for staying with Stayvoo — {ref}", _base_html("Post-Stay Thank You", body))


async def send_invoice_email(b: dict) -> None:
    guest = b.get("guest") or {}
    to_email = guest.get("email")
    if not to_email:
        return
    first = guest.get("first_name", "there")
    hotel = b.get("hotel") or {}
    room = b.get("room") or {}
    ref = b.get("booking_ref", "")
    nights = b.get("nights", 0)
    rate = float(b.get("room_rate", 0))
    total = float(b.get("total_amount", 0))
    commission = float(b.get("commission_amount", 0))
    body = f"""
    <h2 style="margin:0 0 6px;color:{BRAND_COLOR};font-size:20px;font-weight:900;">Your Stayvoo Invoice</h2>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;">Stay reference: <strong>{ref}</strong></p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
      <tr style="background:#f8fafc;">
        <td style="padding:10px 12px;font-size:13px;font-weight:700;color:{BRAND_COLOR};border:1px solid #e2e8f0;">Description</td>
        <td style="padding:10px 12px;font-size:13px;font-weight:700;color:{BRAND_COLOR};border:1px solid #e2e8f0;text-align:right;">Amount</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-size:14px;color:#475569;border:1px solid #e2e8f0;">
          {hotel.get('name', '')} — {room.get('name', '')}<br>
          <span style="color:#94a3b8;font-size:12px;">{b.get('checkin_date')} → {b.get('checkout_date')} · {nights} night{'s' if nights != 1 else ''} × ${rate:.0f}/night</span>
        </td>
        <td style="padding:10px 12px;font-size:14px;color:#475569;border:1px solid #e2e8f0;text-align:right;">${total:.2f}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-size:14px;color:#475569;border:1px solid #e2e8f0;">Stayvoo Service Fee</td>
        <td style="padding:10px 12px;font-size:14px;color:#16a34a;border:1px solid #e2e8f0;text-align:right;font-weight:600;">FREE</td>
      </tr>
      <tr style="background:#f0fdf4;">
        <td style="padding:12px;font-size:15px;font-weight:700;color:{BRAND_COLOR};border:1px solid #e2e8f0;">Total Due at Hotel</td>
        <td style="padding:12px;font-size:18px;font-weight:900;color:{BRAND_COLOR};border:1px solid #e2e8f0;text-align:right;">${total:.2f}</td>
      </tr>
    </table>
    <p style="margin:0;color:#94a3b8;font-size:12px;">
      Payment was collected directly by {hotel.get('name', 'the hotel')} at check-in.
      This document is for your records only.
    </p>"""
    await _send(to_email, f"Stayvoo Invoice — {ref}", _base_html("Invoice", body))
