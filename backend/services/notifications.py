import os
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


def _send_sms(to: str, body: str) -> bool:
    if not to:
        logger.warning("SMS skipped: no recipient phone number")
        return False

    sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    token = os.getenv("TWILIO_AUTH_TOKEN", "")
    from_number = os.getenv("TWILIO_PHONE_NUMBER", "")

    if not all([sid, token, from_number]):
        logger.warning(f"Twilio not configured — would send to {to}:\n{body}")
        return False

    try:
        from twilio.rest import Client
        client = Client(sid, token)
        msg = client.messages.create(to=to, from_=from_number, body=body)
        logger.info(f"SMS sent to {to} | SID: {msg.sid}")
        return True
    except Exception as e:
        logger.error(f"SMS failed to {to}: {e}")
        return False


def notify_new_booking(booking: dict) -> bool:
    to = os.getenv("NOTIFY_PHONE", "")
    guest = booking.get("guest", {}) or {}
    hotel = booking.get("hotel", {}) or {}

    body = (
        f"🔔 NEW STAYVOO BOOKING\n"
        f"Ref: {booking['booking_ref']}\n"
        f"Guest: {guest.get('first_name')} {guest.get('last_name')} ({booking.get('guest_type')})\n"
        f"Hotel: {hotel.get('name')}\n"
        f"Dates: {booking['checkin_date']} to {booking['checkout_date']}\n"
        f"Nights: {booking['nights']}\n"
        f"Phone: {guest.get('phone')}\n"
        f"Email: {guest.get('email')}\n"
        f"Special: {booking.get('special_requests') or 'None'}\n"
        f"Go to: stayvoo.com/admin to confirm"
    )
    return _send_sms(to, body)


def notify_guest_received(booking: dict) -> bool:
    guest = booking.get("guest", {}) or {}
    hotel = booking.get("hotel", {}) or {}
    to = guest.get("phone", "")
    notify_phone = os.getenv("NOTIFY_PHONE", "")

    body = (
        f"Hi {guest.get('first_name')}! Booking received at {hotel.get('name')}.\n"
        f"Ref: {booking['booking_ref']}\n"
        f"Confirming within 30 min.\n"
        f"Questions? Text: {notify_phone}\n"
        f"- Stayvoo Team"
    )
    return _send_sms(to, body)


def notify_guest_confirmed(booking: dict) -> bool:
    guest = booking.get("guest", {}) or {}
    hotel = booking.get("hotel", {}) or {}
    to = guest.get("phone", "")

    body = (
        f"Confirmed! {hotel.get('name')}\n"
        f"Ref: {booking['booking_ref']}\n"
        f"Conf#: {booking.get('pms_confirmation')}\n"
        f"Check-in: {booking['checkin_date']} at 3PM\n"
        f"Address: {hotel.get('address')}\n"
        f"Welcome kit at front desk!\n"
        f"- Stayvoo"
    )
    return _send_sms(to, body)


def notify_pre_arrival(booking: dict) -> bool:
    guest = booking.get("guest", {}) or {}
    hotel = booking.get("hotel", {}) or {}
    to = guest.get("phone", "")

    body = (
        f"See you tomorrow {guest.get('first_name')}!\n"
        f"{hotel.get('name')}\n"
        f"Check-in: 3PM\n"
        f"Free parking available\n"
        f"WiFi details at front desk\n"
        f"Need anything? Reply here.\n"
        f"- Stayvoo"
    )
    return _send_sms(to, body)


def notify_post_stay(booking: dict) -> bool:
    guest = booking.get("guest", {}) or {}
    to = guest.get("phone", "")

    body = (
        f"Thanks for staying {guest.get('first_name')}!\n"
        f"Hope it was great.\n"
        f"Reply AGAIN to book your next stay\n"
        f"at exclusive rate.\n"
        f"- Stayvoo Team"
    )
    return _send_sms(to, body)
