"""
End-to-end Playwright tests against https://stayvoo.com (live production).

Stripe test card: 4242 4242 4242 4242  exp: 12/29  cvc: 123
Admin password: set via required ADMIN_PASSWORD env var (no fallback — never hardcode it here)
Test email: vp431030@gmail.com — must be the allowlisted address (see
backend/services/allowlist.py) or every outbound send in these tests gets
silently blocked+logged rather than actually sent.

Run:
    ADMIN_PASSWORD=... pytest tests/test_e2e.py -v --headed
    ADMIN_PASSWORD=... pytest tests/test_e2e.py -v             # headless (CI)
    ADMIN_PASSWORD=... pytest tests/test_e2e.py::test_full_booking_flow -v --headed
"""

import os
import re
import time
import pytest
import requests
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import Page, BrowserContext, expect

# ── Config ────────────────────────────────────────────────────────────────────

BASE_URL = "https://stayvoo.com"
API_URL = "https://stayvoo-backend-production.up.railway.app"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    raise RuntimeError(
        "ADMIN_PASSWORD env var is required to run these tests — "
        "never hardcode the production admin password in this file."
    )
TEST_EMAIL = "vp431030@gmail.com"
STRIPE_TEST_CARD = "4242424242424242"

SCREENSHOT_DIR = Path("tests/screenshots")

# Use dates far enough in the future to not conflict with existing data
CHECKIN = (date.today() + timedelta(days=45)).isoformat()
CHECKOUT = (date.today() + timedelta(days=47)).isoformat()


# ── Shared helpers ────────────────────────────────────────────────────────────

def save_screenshot(page: Page, name: str) -> Path:
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    path = SCREENSHOT_DIR / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    print(f"\n  [screenshot] {path}")
    return path


def api_get_hotels() -> list:
    r = requests.get(f"{API_URL}/hotels", timeout=15)
    r.raise_for_status()
    return r.json()


def api_create_reservation(first_name: str = "E2E", last_name: str = "Test") -> dict:
    """
    Create a reservation via the backend API (bypasses UI).
    Returns the full reservation response dict including portal_url.
    """
    hotels = api_get_hotels()
    assert hotels, "No hotels returned — is the backend reachable?"
    hotel = hotels[0]
    rooms = hotel.get("rooms", [])
    assert rooms, f"Hotel '{hotel['name']}' has no rooms"
    room = rooms[0]
    room_id = room.get("id") or room.get("room_id")

    payload = {
        "hotel_id": hotel["id"],
        "room_id": room_id,
        "guest": {
            "first_name": first_name,
            "last_name": last_name,
            "email": TEST_EMAIL,
            "phone": "+15550000001",
            "guest_type": "leisure",
        },
        "checkin_date": CHECKIN,
        "checkout_date": CHECKOUT,
        "source": "e2e_test",
    }
    r = requests.post(f"{API_URL}/reservations", json=payload, timeout=15)
    r.raise_for_status()
    return r.json()


def api_get_reservation(ref: str, token: str) -> dict:
    r = requests.get(f"{API_URL}/reservations/{ref}", params={"token": token}, timeout=15)
    r.raise_for_status()
    return r.json()


def api_cancel_reservation(res_id: str) -> None:
    r = requests.put(
        f"{API_URL}/admin/reservations/{res_id}/cancel",
        headers={"x-admin-password": ADMIN_PASSWORD},
        timeout=15,
    )
    r.raise_for_status()


def cleanup_e2e_reservations() -> int:
    """Cancel all pending/confirmed e2e test reservations to restore available_count."""
    try:
        r = requests.get(
            f"{API_URL}/admin/reservations",
            params={"search": TEST_EMAIL},
            headers={"x-admin-password": ADMIN_PASSWORD},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        reservations = data.get("reservations", [])
        cancelled = 0
        for res in reservations:
            if res.get("status") in ("pending", "confirmed"):
                try:
                    api_cancel_reservation(res["id"])
                    cancelled += 1
                except Exception:
                    pass
        return cancelled
    except Exception:
        return 0


def admin_login(page: Page):
    """Navigate to /admin and log in with the admin password."""
    page.goto(f"{BASE_URL}/admin", wait_until="networkidle")
    pw_field = page.get_by_placeholder("Enter admin password")
    pw_field.wait_for(state="visible", timeout=10_000)
    pw_field.fill(ADMIN_PASSWORD)
    page.get_by_role("button", name="Login").click()
    # Dashboard header confirms login
    page.get_by_text("Stayvoo Admin").wait_for(state="visible", timeout=15_000)


def open_reservation_modal(page: Page, ref: str):
    """
    In the admin Reservations tab, search for `ref` and click the row to open
    the detail modal.
    """
    # Click the Reservations tab (may have a badge like "9 new" appended — use starts-with)
    page.get_by_role("button", name=re.compile(r"^Reservations")).first.click()
    page.wait_for_timeout(600)

    # Type ref into the search box
    search = page.get_by_placeholder("Search by name, email, ref, or hotel...")
    search.fill(ref)
    page.wait_for_timeout(1_500)  # debounce

    # Click the row — the ref appears as a small badge
    row = page.get_by_text(ref, exact=True).first
    row.wait_for(state="visible", timeout=10_000)
    row.click()

    # Wait for the modal shell
    page.locator("text=PMS Confirmation Number").or_(
        page.locator("text=Cancel Reservation")
    ).first.wait_for(state="visible", timeout=10_000)


def fill_stripe_card(page: Page):
    """
    Fill the Stripe CardElement (single unified iframe) with the test card.

    Strategy: use FrameLocator + press_sequentially() which sends individual
    keydown/keypress/keyup events per character — the most reliable way to
    trigger Stripe's internal event listeners and flip cardComplete to True.
    """
    # Stripe.js loads async from CDN — wait up to 20 s for the iframe
    page.wait_for_selector("iframe[name^='__privateStripeFrame']", timeout=20_000)
    # Give Stripe a moment to finish internal setup (connects to r.stripe.com)
    page.wait_for_timeout(1_000)

    fl = page.frame_locator("iframe[name^='__privateStripeFrame']").first

    # Card number — press_sequentially fires authentic key events Stripe listens for
    card_num = fl.locator('[name="cardnumber"]')
    card_num.wait_for(state="visible", timeout=10_000)
    card_num.click()
    card_num.press_sequentially(STRIPE_TEST_CARD, delay=60)

    # Expiry
    exp = fl.locator('[name="exp-date"]')
    exp.click()
    exp.press_sequentially("1229", delay=60)

    # CVC
    cvc = fl.locator('[name="cvc"]')
    cvc.click()
    cvc.press_sequentially("123", delay=60)

    # Postal code (ZIP) — Stripe CardElement shows this when hidePostalCode is not set.
    # Without it, event.complete stays false and the submit button stays disabled.
    postal = fl.locator('[name="postal"]')
    try:
        postal.wait_for(state="visible", timeout=3_000)
        postal.click()
        postal.press_sequentially("12345", delay=60)
    except Exception:
        pass  # field absent (hidePostalCode=true), skip

    # Give Stripe's onChange time to propagate to React's cardComplete state
    page.wait_for_timeout(3_000)


# ── pytest config ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {**browser_context_args, "viewport": {"width": 1280, "height": 900}}


@pytest.fixture(scope="session", autouse=True)
def cleanup_e2e_reservations_fixture():
    """Cancel lingering e2e test reservations before the suite to restore room availability."""
    n = cleanup_e2e_reservations()
    if n:
        print(f"\n  [cleanup] Cancelled {n} stale e2e reservations before suite")
    yield
    # Also clean up after — keeps the DB tidy across repeated runs
    cleanup_e2e_reservations()


# ── Test 1: Full booking flow ─────────────────────────────────────────────────

def test_full_booking_flow(page: Page):
    """
    Visit stayvoo.com → search → pick first hotel → pick first room →
    fill booking form with Stripe test card → submit →
    assert confirmation page shows a RES-* reference number.
    """
    checkin = (date.today() + timedelta(days=45)).isoformat()
    checkout = (date.today() + timedelta(days=47)).isoformat()

    try:
        # 1. Home page
        page.goto(BASE_URL, wait_until="networkidle")
        expect(page.get_by_role("button", name=re.compile("Search Hotels", re.I))).to_be_visible(
            timeout=10_000
        )

        # 2. Fill the search bar and submit
        date_inputs = page.locator('input[type="date"]')
        date_inputs.nth(0).fill(checkin)
        date_inputs.nth(1).fill(checkout)
        page.get_by_role("button", name=re.compile("Search Hotels", re.I)).click()

        # 3. Search results page
        page.wait_for_url(f"{BASE_URL}/search*", timeout=12_000)
        page.wait_for_load_state("networkidle")

        # Click the first hotel button (exclusive hotels → "Get Exclusive Rate →")
        hotel_btn = page.get_by_role(
            "button", name=re.compile("Get Exclusive Rate|View Rooms", re.I)
        ).first
        hotel_btn.wait_for(state="visible", timeout=10_000)
        hotel_btn.click()

        # 4. Hotel detail page
        page.wait_for_url(f"{BASE_URL}/hotels/*", timeout=12_000)
        page.wait_for_load_state("networkidle")

        # Set dates on hotel detail page (in case they differ)
        detail_dates = page.locator('input[type="date"]')
        if detail_dates.count() >= 2:
            detail_dates.nth(0).fill(checkin)
            detail_dates.nth(1).fill(checkout)
            page.wait_for_timeout(300)

        # 5. Click "Book This Room" on the first available room
        book_btn = page.get_by_role("button", name=re.compile("Book This Room", re.I)).first
        book_btn.wait_for(state="visible", timeout=10_000)
        expect(book_btn).not_to_be_disabled(timeout=5_000)
        book_btn.click()

        # 6. Booking form — use "load" not "networkidle" (Stripe.js keeps connections)
        page.wait_for_url(f"{BASE_URL}/book*", timeout=12_000)
        page.wait_for_load_state("load")
        expect(page.get_by_text("Guest Details")).to_be_visible(timeout=10_000)

        page.locator('input[placeholder="Jane"]').fill("E2E")
        page.locator('input[placeholder="Smith"]').fill("Playwright")

        email_field = page.locator('input[placeholder="jane@example.com"]')
        email_field.fill(TEST_EMAIL)
        email_field.blur()  # triggers guest check but we ignore auto-fill here

        page.locator('input[placeholder="+1 (xxx) xxx-xxxx"]').fill("+15550000001")

        # 7. Fill Stripe card — fill_stripe_card waits up to 20 s for the iframe
        fill_stripe_card(page)
        # Debug: capture the Stripe card state immediately after filling
        # 8. Submit — wait up to 20 s for cardComplete to flip the button on
        submit = page.get_by_role("button", name=re.compile(r"Confirm Booking", re.I))
        submit.wait_for(state="visible", timeout=10_000)
        expect(submit).not_to_be_disabled(timeout=20_000)
        submit.click()

        # 9. Confirmation page
        page.wait_for_url(f"{BASE_URL}/confirmation*", timeout=30_000)
        page.wait_for_load_state("networkidle")
        expect(page.get_by_text("Booking Received!")).to_be_visible(timeout=10_000)

        # Extract ref from URL query param (format: SD-CHO1-XXXX / SD-WYN2-XXXX)
        import urllib.parse
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(page.url).query)
        ref_text = qs.get("ref", [""])[0]
        assert re.fullmatch(r"SD-[A-Z0-9]+-\d{4}", ref_text), (
            f"Unexpected ref format in URL: {ref_text!r} (page: {page.url})"
        )
        # Also verify the ref is rendered on the page
        page.locator(f"text={ref_text}").first.wait_for(state="visible", timeout=10_000)

        save_screenshot(page, "test1_booking_confirmation_PASS")
        print(f"\n  [PASS] Reservation ref: {ref_text}")

    except Exception as exc:
        save_screenshot(page, "test1_full_booking_flow_FAIL")
        pytest.fail(f"Test 1 (full booking flow) FAILED: {exc}")


# ── Test 2: Returning guest recognition ────────────────────────────────────────

def test_returning_guest_autofill(page: Page):
    """
    After creating a reservation for e2etest@stayvoo.com via API (ensuring
    the guest exists), open a booking form, enter the same email and blur.
    The first name and last name fields should be auto-filled from the guest record.
    """
    try:
        # Ensure the guest exists in the DB
        res = api_create_reservation(first_name="Returnee", last_name="GuestTest")
        print(f"\n  Setup: created reservation {res['reservation_ref']} for {TEST_EMAIL}")

        # Navigate directly to a booking form (skip UI hotel picker)
        hotels = api_get_hotels()
        hotel = hotels[0]
        rooms = hotel.get("rooms", [])
        room_id = rooms[0].get("id") or rooms[0].get("room_id", "")
        checkin = (date.today() + timedelta(days=50)).isoformat()
        checkout = (date.today() + timedelta(days=52)).isoformat()

        url = (
            f"{BASE_URL}/book"
            f"?hotel_id={hotel['id']}"
            f"&room_id={room_id}"
            f"&checkin={checkin}"
            f"&checkout={checkout}"
        )
        # Use "load" (not "networkidle") — Stripe.js keeps background connections
        # open that prevent networkidle from ever firing within 30 s.
        page.goto(url, wait_until="load")
        page.get_by_text("Guest Details").wait_for(state="visible", timeout=10_000)

        first_name_input = page.locator('input[placeholder="Jane"]')
        last_name_input = page.locator('input[placeholder="Smith"]')
        email_input = page.locator('input[placeholder="jane@example.com"]')

        # Ensure name fields are blank before we trigger the check
        first_name_input.clear()
        last_name_input.clear()

        # Type the known email and blur — BookingForm calls GET /guests/check on blur
        email_input.fill(TEST_EMAIL)
        email_input.blur()

        # Give the async /guests/check call time to resolve and React to re-render
        page.wait_for_timeout(2_500)

        first_val = first_name_input.input_value()
        last_val = last_name_input.input_value()

        assert first_val.strip(), (
            f"First name was NOT auto-filled after entering known email. "
            f"Got: {first_val!r}. The guest may not exist — check /guests/check endpoint."
        )
        assert last_val.strip(), (
            f"Last name was NOT auto-filled. Got: {last_val!r}"
        )

        save_screenshot(page, "test2_returning_guest_PASS")
        print(f"\n  [PASS] Auto-filled: first={first_val!r}, last={last_val!r}")

    except Exception as exc:
        save_screenshot(page, "test2_returning_guest_FAIL")
        pytest.fail(f"Test 2 (returning guest auto-fill) FAILED: {exc}")


# ── Test 3: Admin confirm flow ────────────────────────────────────────────────

def test_admin_confirm_flow(page: Page):
    """
    Create a pending reservation via API, log in to /admin,
    find the reservation by ref, enter a PMS confirmation number,
    click "Confirm Reservation", assert the API status changes to 'confirmed'.
    """
    try:
        # Create a fresh pending reservation
        res = api_create_reservation(first_name="AdminConfirm", last_name="Test")
        ref = res["reservation_ref"]
        res_id = res["id"]
        token = res["guest_token"]
        print(f"\n  Setup: pending reservation {ref}")

        # Verify it's pending
        assert api_get_reservation(ref, token)["status"] == "pending", (
            f"Expected new reservation {ref} to be pending"
        )

        # Log in to admin
        admin_login(page)

        # Open the reservation modal
        open_reservation_modal(page, ref)

        # The PMS input and Confirm button are shown for pending reservations
        pms_input = page.get_by_placeholder(re.compile(r"e\.g\. WYN|WYN-", re.I)).first
        pms_input.wait_for(state="visible", timeout=8_000)
        pms_input.fill("TEST-CONF-001")

        confirm_btn = page.get_by_role("button", name=re.compile("Confirm Reservation", re.I))
        confirm_btn.wait_for(state="visible", timeout=5_000)
        expect(confirm_btn).not_to_be_disabled()
        confirm_btn.click()

        # Wait for the API call to complete
        page.wait_for_timeout(3_000)

        # Verify via API
        updated = api_get_reservation(ref, token)
        status = updated["status"]
        assert status == "confirmed", (
            f"Expected status='confirmed' for {ref} after admin confirm, got {status!r}"
        )

        save_screenshot(page, "test3_admin_confirm_PASS")
        print(f"\n  [PASS] Reservation {ref} status = confirmed")

    except Exception as exc:
        save_screenshot(page, "test3_admin_confirm_FAIL")
        pytest.fail(f"Test 3 (admin confirm flow) FAILED: {exc}")


# ── Test 4: Messaging round trip ──────────────────────────────────────────────

def test_messaging_round_trip(page: Page):
    """
    Create reservation, get portal URL, guest sends a message via portal,
    admin replies via API, refresh portal — assert admin reply is visible.
    """
    try:
        res = api_create_reservation(first_name="MsgGuest", last_name="Test")
        ref = res["reservation_ref"]
        res_id = res["id"]
        portal_url = res.get("portal_url", "")

        print(f"\n  Setup: reservation {ref}")
        print(f"  Portal URL: {portal_url or '(none — guest may not have token)'}")

        if not portal_url:
            pytest.skip(
                "No portal_url in reservation response. "
                "The guest record may not have an access_token yet — "
                "run this test again after at least one login email has been triggered."
            )

        # ── Step A: Guest sends a message ────────────────────────────────────
        page.goto(portal_url, wait_until="networkidle")

        # Wait for the portal to load and show this reservation
        page.get_by_text(ref, exact=True).wait_for(state="visible", timeout=15_000)

        # Expand the messages thread on the first reservation card
        msg_toggle = page.get_by_role("button", name=re.compile(r"Messages", re.I)).first
        msg_toggle.click()
        page.wait_for_timeout(600)

        guest_msg = f"E2E guest message — {int(time.time())}"
        msg_input = page.get_by_placeholder(re.compile("Message Stayvoo", re.I)).first
        msg_input.wait_for(state="visible", timeout=5_000)
        msg_input.fill(guest_msg)

        send_btn = page.get_by_role("button", name="Send").first
        send_btn.click()

        # Assert the message appears in the thread
        page.get_by_text(guest_msg).wait_for(state="visible", timeout=10_000)
        print(f"  Guest sent: {guest_msg!r}")

        # ── Step B: Admin replies via API ─────────────────────────────────────
        admin_reply = f"E2E admin reply — {int(time.time())}"
        reply_res = requests.post(
            f"{API_URL}/admin/reservations/{res_id}/messages",
            json={"message": admin_reply},
            headers={"x-admin-password": ADMIN_PASSWORD},
            timeout=15,
        )
        reply_res.raise_for_status()
        print(f"  Admin replied: {admin_reply!r}")

        # ── Step C: Refresh portal and assert admin reply is visible ──────────
        page.reload(wait_until="networkidle")
        page.get_by_text(ref, exact=True).wait_for(state="visible", timeout=15_000)

        # Re-expand messages
        msg_toggle2 = page.get_by_role("button", name=re.compile(r"Messages", re.I)).first
        msg_toggle2.click()
        page.wait_for_timeout(1_000)

        page.get_by_text(admin_reply).wait_for(state="visible", timeout=10_000)

        save_screenshot(page, "test4_messaging_round_trip_PASS")
        print(f"\n  [PASS] Admin reply visible in guest portal")

    except Exception as exc:
        save_screenshot(page, "test4_messaging_round_trip_FAIL")
        pytest.fail(f"Test 4 (messaging round trip) FAILED: {exc}")


# ── Test 5: Cancellation ──────────────────────────────────────────────────────

def test_cancellation(page: Page):
    """
    Create a pending reservation via API, log in to admin,
    open the reservation detail modal, click Cancel (twice — two-step confirm),
    assert the reservation status becomes 'cancelled' via API.
    """
    try:
        res = api_create_reservation(first_name="CancelMe", last_name="Test")
        ref = res["reservation_ref"]
        token = res["guest_token"]
        print(f"\n  Setup: pending reservation {ref}")

        # Log in to admin
        admin_login(page)

        # Open the reservation modal
        open_reservation_modal(page, ref)

        # ── First click: "Cancel Reservation" ────────────────────────────────
        cancel_btn = page.get_by_role("button", name="Cancel Reservation")
        cancel_btn.wait_for(state="visible", timeout=8_000)
        cancel_btn.click()
        page.wait_for_timeout(400)

        # ── Second click: "⚠ Confirm Cancel — Guest will be emailed" ─────────
        confirm_cancel = page.get_by_role(
            "button",
            name=re.compile(r"Confirm Cancel|Guest will be emailed", re.I),
        )
        expect(confirm_cancel).to_be_visible(timeout=5_000)
        confirm_cancel.click()

        # Wait for the API call and modal to close
        page.wait_for_timeout(4_000)

        # Verify via API
        updated = api_get_reservation(ref, token)
        status = updated["status"]
        assert status == "cancelled", (
            f"Expected status='cancelled' for {ref} after admin cancel, got {status!r}"
        )

        save_screenshot(page, "test5_cancellation_PASS")
        print(f"\n  [PASS] Reservation {ref} status = cancelled")

    except Exception as exc:
        save_screenshot(page, "test5_cancellation_FAIL")
        pytest.fail(f"Test 5 (cancellation) FAILED: {exc}")


# ── Test 6: Admin login / logout ───────────────────────────────────────────────

def test_admin_login_logout(page: Page):
    try:
        admin_login(page)
        expect(page.get_by_text("Stayvoo Admin")).to_be_visible(timeout=10_000)

        page.get_by_role("button", name="Logout").click()
        pw_field = page.get_by_placeholder("Enter admin password")
        pw_field.wait_for(state="visible", timeout=10_000)

        save_screenshot(page, "test6_admin_login_logout_PASS")
    except Exception as exc:
        save_screenshot(page, "test6_admin_login_logout_FAIL")
        pytest.fail(f"Test 6 (admin login/logout) FAILED: {exc}")


# ── Test 7: Every /admin/* route rejects requests without the password ────────

ADMIN_ROUTES_NO_AUTH = [
    ("GET", "/admin/bookings"),
    ("GET", "/admin/reservations"),
    ("GET", "/admin/inquiries"),
    ("GET", "/admin/stays"),
    ("GET", "/admin/hotels"),
    ("GET", "/admin/commission-rates"),
    ("GET", "/admin/guests"),
    ("GET", "/admin/today"),
    ("GET", "/admin/search?q=test"),
    ("GET", "/admin/audit-log"),
    ("GET", "/admin/billing/2026-01"),
    ("GET", "/admin/test-email"),
]


def test_admin_routes_require_auth():
    for method, path in ADMIN_ROUTES_NO_AUTH:
        r = requests.request(method, f"{API_URL}{path}", timeout=15)
        assert r.status_code in (401, 422), (
            f"{method} {path} without x-admin-password should reject (401/422), got {r.status_code}"
        )
        if r.status_code == 200:
            pytest.fail(f"{method} {path} returned 200 with no admin password — auth bypass!")
    print(f"\n  [PASS] {len(ADMIN_ROUTES_NO_AUTH)} admin routes all reject unauthenticated requests")


# ── Test 8: Edge cases ─────────────────────────────────────────────────────────

def test_edge_case_checkout_before_checkin():
    hotels = api_get_hotels()
    hotel = hotels[0]
    room = hotel["rooms"][0]
    payload = {
        "hotel_id": hotel["id"],
        "room_id": room.get("id") or room.get("room_id"),
        "guest": {
            "first_name": "Edge", "last_name": "Case", "email": TEST_EMAIL,
            "phone": "+15550000001", "guest_type": "leisure",
        },
        "checkin_date": CHECKOUT,   # deliberately swapped
        "checkout_date": CHECKIN,
        "source": "e2e_test",
    }
    r = requests.post(f"{API_URL}/reservations", json=payload, timeout=15)
    assert r.status_code == 400, f"Expected 400 for checkout <= checkin, got {r.status_code}: {r.text}"


def test_edge_case_missing_required_fields():
    r = requests.post(f"{API_URL}/reservations", json={"hotel_id": "not-a-real-id"}, timeout=15)
    assert r.status_code in (400, 404, 422), f"Expected a rejection, got {r.status_code}: {r.text}"


def test_edge_case_invalid_reservation_id():
    r = requests.get(f"{API_URL}/reservations/SD-DOES-NOT-EXIST-9999", params={"token": "x"}, timeout=15)
    assert r.status_code in (401, 404), f"Expected 401/404 for a nonexistent ref, got {r.status_code}"

    r2 = requests.get(
        f"{API_URL}/admin/guests/00000000-0000-0000-0000-000000000000",
        headers={"x-admin-password": ADMIN_PASSWORD}, timeout=15,
    )
    assert r2.status_code == 404, f"Expected 404 for a nonexistent guest id, got {r2.status_code}"


def test_edge_case_reservation_get_requires_correct_token():
    res = api_create_reservation(first_name="TokenCheck", last_name="Test")
    ref = res["reservation_ref"]
    try:
        r = requests.get(f"{API_URL}/reservations/{ref}", params={"token": "wrong-token"}, timeout=15)
        assert r.status_code == 401, f"Expected 401 for a wrong token, got {r.status_code}"

        r2 = requests.get(f"{API_URL}/reservations/{ref}", timeout=15)
        assert r2.status_code == 401, f"Expected 401 with no token at all, got {r2.status_code}"
    finally:
        api_cancel_reservation(res["id"])


# ── Test 9: Full reservation status lifecycle ──────────────────────────────────

def test_reservation_status_lifecycle():
    res = api_create_reservation(first_name="Lifecycle", last_name="Test")
    res_id, ref, token = res["id"], res["reservation_ref"], res["guest_token"]
    headers = {"x-admin-password": ADMIN_PASSWORD}
    try:
        assert api_get_reservation(ref, token)["status"] == "pending"

        r = requests.put(
            f"{API_URL}/admin/reservations/{res_id}/confirm",
            json={"pms_confirmation": "E2E-LIFECYCLE"}, headers=headers, timeout=15,
        )
        r.raise_for_status()
        assert api_get_reservation(ref, token)["status"] == "confirmed"

        r = requests.post(f"{API_URL}/admin/reservations/{res_id}/checkin", headers=headers, timeout=15)
        r.raise_for_status()
        assert api_get_reservation(ref, token)["status"] == "checked_in"

        r = requests.post(f"{API_URL}/admin/reservations/{res_id}/checkout", headers=headers, timeout=15)
        r.raise_for_status()
        assert api_get_reservation(ref, token)["status"] == "checked_out"

        # Cannot cancel a checked-out reservation
        r = requests.put(f"{API_URL}/admin/reservations/{res_id}/cancel", headers=headers, timeout=15)
        assert r.status_code == 400, "Expected checked-out reservations to reject cancellation"

        # Every status transition should be in the audit log
        audit = requests.get(
            f"{API_URL}/admin/audit-log", params={"entity_type": "reservation", "entity_id": res_id},
            headers=headers, timeout=15,
        ).json()
        statuses_logged = {a["new_value"] for a in audit if a["field"] == "status"}
        assert {"confirmed", "checked_in", "checked_out"} <= statuses_logged, (
            f"Expected all 3 status transitions in audit log, got {statuses_logged}"
        )
        print(f"\n  [PASS] {ref} completed full lifecycle, audit log has {len(audit)} entries")
    finally:
        # already checked out — nothing to clean up via cancel; leave the record as-is (real lifecycle data)
        pass


# ── Test 10: Inquiry → respond → convert to stay ───────────────────────────────

def test_inquiry_respond_and_convert_to_stay():
    headers = {"x-admin-password": ADMIN_PASSWORD}
    payload = {
        "first_name": "InqE2E", "last_name": "Test", "email": TEST_EMAIL, "phone": "+15550000002",
        "guest_type": "group", "num_rooms": 3, "length_of_stay": "2 weeks",
        "start_date": CHECKIN, "source": "e2e_test",
    }
    r = requests.post(f"{API_URL}/inquiries", json=payload, timeout=15)
    r.raise_for_status()
    inq = r.json()
    inq_id = inq["id"]

    # Admin responds
    r = requests.post(
        f"{API_URL}/admin/inquiries/{inq_id}/messages",
        json={"sender": "admin", "sender_name": "Stayvoo Team", "message": "E2E test reply"},
        headers=headers, timeout=15,
    )
    r.raise_for_status()

    msgs = requests.get(f"{API_URL}/admin/inquiries/{inq_id}/messages", headers=headers, timeout=15).json()
    assert any(m["message"] == "E2E test reply" for m in msgs)

    # Convert to stay
    stay_payload = {
        "inquiry_id": inq_id, "guest_first_name": "InqE2E", "guest_last_name": "Test",
        "guest_email": TEST_EMAIL, "guest_phone": "+15550000002", "hotel_name": "E2E Test Hotel",
        "num_rooms": 3, "checkin_date": CHECKIN, "expected_checkout": CHECKOUT, "rate_per_night": 100,
    }
    r = requests.post(f"{API_URL}/admin/stays", json=stay_payload, headers=headers, timeout=15)
    r.raise_for_status()
    stay = r.json()
    assert stay["inquiry_id"] == inq_id
    print(f"\n  [PASS] Inquiry {inq_id[:8]} converted to stay {stay['id'][:8]}")


# ── Test 11: Global search ──────────────────────────────────────────────────────

def test_global_search_finds_reservation():
    res = api_create_reservation(first_name="Searchable", last_name="Unicorn")
    try:
        headers = {"x-admin-password": ADMIN_PASSWORD}
        r = requests.get(f"{API_URL}/admin/search", params={"q": "Searchable Unicorn"}, headers=headers, timeout=15)
        r.raise_for_status()
        data = r.json()
        assert any(rr["reservation_ref"] == res["reservation_ref"] for rr in data["reservations"]), (
            "Global search did not find the reservation we just created"
        )
    finally:
        api_cancel_reservation(res["id"])


# ── Test 12: Today view renders expected shape ─────────────────────────────────

def test_today_view_shape():
    headers = {"x-admin-password": ADMIN_PASSWORD}
    r = requests.get(f"{API_URL}/admin/today", headers=headers, timeout=15)
    r.raise_for_status()
    data = r.json()
    for key in ("date", "arrivals_today", "departures_today", "new_inquiries",
                "pending_reservations", "unpaid_invoices_past_due", "stats"):
        assert key in data, f"Today view response missing key: {key}"
    for key in ("active_stays", "week_arrivals", "pending_commission"):
        assert key in data["stats"], f"Today view stats missing key: {key}"


# ── Test 13: Invoice send validation ────────────────────────────────────────────

def test_invoice_send_rejects_missing_email():
    headers = {"x-admin-password": ADMIN_PASSWORD}
    r = requests.post(
        f"{API_URL}/admin/billing/invoice/2026-01",
        json={"hotel_name": "Wyndham Brookfield"}, headers=headers, timeout=15,
    )
    assert r.status_code == 422, f"Expected 422 for missing recipient_email, got {r.status_code}"


def test_invoice_send_blocks_non_allowlisted_recipient():
    headers = {"x-admin-password": ADMIN_PASSWORD}
    r = requests.post(
        f"{API_URL}/admin/billing/invoice/2026-01",
        json={"hotel_name": "Wyndham Brookfield", "recipient_email": "not-the-allowlisted-address@example.com"},
        headers=headers, timeout=15,
    )
    assert r.status_code == 502, (
        f"Expected 502 (blocked by allowlist, never falsely marked sent), got {r.status_code}: {r.text}"
    )


# ── Test 14: Double-submit protection on the booking form ─────────────────────

def test_booking_form_disables_submit_after_click(page: Page):
    """Confirms the existing double-submit guard: the Confirm Booking button
    disables itself (via `submitting` state) as soon as it's clicked, so a
    fast double-click/double-Enter can't fire two reservation creates."""
    try:
        page.goto(BASE_URL, wait_until="networkidle")
        date_inputs = page.locator('input[type="date"]')
        date_inputs.nth(0).fill(CHECKIN)
        date_inputs.nth(1).fill(CHECKOUT)
        page.get_by_role("button", name=re.compile("Search Hotels", re.I)).click()
        page.wait_for_url(f"{BASE_URL}/search*", timeout=12_000)
        page.wait_for_load_state("networkidle")

        hotel_btn = page.get_by_role("button", name=re.compile("Get Exclusive Rate|View Rooms", re.I)).first
        hotel_btn.wait_for(state="visible", timeout=10_000)
        hotel_btn.click()
        page.wait_for_url(f"{BASE_URL}/hotels/*", timeout=12_000)
        page.wait_for_load_state("networkidle")

        book_btn = page.get_by_role("button", name=re.compile("Book This Room", re.I)).first
        book_btn.wait_for(state="visible", timeout=10_000)
        book_btn.click()
        page.wait_for_url(f"{BASE_URL}/book*", timeout=12_000)
        page.wait_for_load_state("load")

        page.locator('input[placeholder="Jane"]').fill("Double")
        page.locator('input[placeholder="Smith"]').fill("Submit")
        email_field = page.locator('input[placeholder="jane@example.com"]')
        email_field.fill(TEST_EMAIL)
        email_field.blur()
        page.locator('input[placeholder="+1 (xxx) xxx-xxxx"]').fill("+15550000003")
        fill_stripe_card(page)

        submit = page.get_by_role("button", name=re.compile(r"Confirm Booking", re.I))
        submit.wait_for(state="visible", timeout=10_000)
        expect(submit).not_to_be_disabled(timeout=20_000)
        submit.click()

        # Immediately after the click, the button must already be disabled
        expect(submit).to_be_disabled(timeout=2_000)

        save_screenshot(page, "test14_double_submit_guard_PASS")
    except Exception as exc:
        save_screenshot(page, "test14_double_submit_guard_FAIL")
        pytest.fail(f"Test 14 (double-submit guard) FAILED: {exc}")
