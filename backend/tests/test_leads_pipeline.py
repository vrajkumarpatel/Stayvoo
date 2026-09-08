"""
Unit tests for the B2B lead-generation pipeline: scoring, dedup, suppression
enforcement, and allowlist enforcement.

Run from backend/: `venv\\Scripts\\python -m pytest tests/test_leads_pipeline.py -v`
Uses an in-memory SQLite DB per test (see conftest.py) — never touches the real
(Supabase) DATABASE_URL. SendGrid/Twilio/Groq clients are mocked; no network calls.
"""
import json
import uuid
from unittest.mock import patch, MagicMock

import pytest

import models
from models import Lead, LeadEmailSuppression
from services import lead_scoring, lead_dedup, lead_outreach, allowlist


# ─── Scoring: deterministic heuristic fallback ──────────────────────────────

def test_heuristic_scoring_returns_real_weighted_result_not_a_stub():
    hot = lead_scoring.score_lead_heuristic({
        "company_name": "Milwaukee Traveler Nurse Staffing",
        "industry": "travel nurse staffing",
        "company_size": "150-300",
        "city": "Milwaukee",
        "state": "WI",
    })
    cold = lead_scoring.score_lead_heuristic({
        "company_name": "Generic Widget Co",
        "industry": "widget manufacturing",
        "company_size": "3",
        "city": "Anchorage",
        "state": "AK",
    })

    # Different inputs must produce genuinely different scores — proves this is a
    # real weighted heuristic, not a stub that always returns the same value.
    assert hot["score"] != cold["score"]
    assert hot["score"] > cold["score"]
    assert hot["tier"] == "hot"
    assert cold["tier"] == "cold"
    for result in (hot, cold):
        assert result["tier"] in {"hot", "warm", "cold"}
        assert 0 <= result["score"] <= 100
        assert result["reasoning"]


def test_heuristic_scoring_is_deterministic():
    payload = {
        "company_name": "Great Lakes Contracting",
        "industry": "construction",
        "company_size": "200-400",
        "city": "Waukesha",
        "state": "WI",
    }
    first = lead_scoring.score_lead_heuristic(payload)
    second = lead_scoring.score_lead_heuristic(payload)
    assert first == second


def test_heuristic_scoring_rewards_target_industry():
    construction = lead_scoring.score_lead_heuristic({
        "industry": "construction", "company_size": "100", "city": "Chicago", "state": "IL",
    })
    unrelated = lead_scoring.score_lead_heuristic({
        "industry": "pet grooming", "company_size": "100", "city": "Chicago", "state": "IL",
    })
    assert construction["score"] > unrelated["score"]


def test_heuristic_scoring_rewards_metro_proximity():
    milwaukee = lead_scoring.score_lead_heuristic({
        "industry": "staffing agency", "company_size": "100", "city": "Milwaukee", "state": "WI",
    })
    far_away = lead_scoring.score_lead_heuristic({
        "industry": "staffing agency", "company_size": "100", "city": "Miami", "state": "FL",
    })
    assert milwaukee["score"] > far_away["score"]


def test_heuristic_scoring_rewards_fit_company_size():
    mid_size = lead_scoring.score_lead_heuristic({
        "industry": "construction", "company_size": "300", "city": "Milwaukee", "state": "WI",
    })
    tiny = lead_scoring.score_lead_heuristic({
        "industry": "construction", "company_size": "2", "city": "Milwaukee", "state": "WI",
    })
    assert mid_size["score"] > tiny["score"]


# ─── Scoring: GROQ_API_KEY unset falls back to heuristic ────────────────────

def test_score_lead_sync_falls_back_to_heuristic_when_groq_unset(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    result = lead_scoring.score_lead_sync({
        "industry": "construction", "company_size": "100", "city": "Milwaukee", "state": "WI",
    })
    assert result["tier"] in {"hot", "warm", "cold"}
    assert 0 <= result["score"] <= 100


# ─── Scoring: Groq path structure validation (mocked client, no network) ────

def test_score_lead_sync_uses_groq_and_validates_structured_json(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "fake-test-key")

    mock_message = MagicMock()
    mock_message.content = json.dumps({"tier": "hot", "score": 92, "reasoning": "Strong fit."})
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]

    mock_client_instance = MagicMock()
    mock_client_instance.chat.completions.create.return_value = mock_completion

    with patch("groq.Groq", return_value=mock_client_instance) as mock_groq_cls:
        result = lead_scoring.score_lead_sync({
            "company_name": "Test Co", "industry": "construction",
            "company_size": "100", "city": "Milwaukee", "state": "WI",
        })

    mock_groq_cls.assert_called_once_with(api_key="fake-test-key")
    create_kwargs = mock_client_instance.chat.completions.create.call_args.kwargs
    assert create_kwargs["model"] == "openai/gpt-oss-120b"
    assert result == {"tier": "hot", "score": 92, "reasoning": "Strong fit."}


def test_score_lead_sync_falls_back_on_malformed_groq_json(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "fake-test-key")

    mock_message = MagicMock()
    mock_message.content = "not valid json at all"
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]
    mock_client_instance = MagicMock()
    mock_client_instance.chat.completions.create.return_value = mock_completion

    with patch("groq.Groq", return_value=mock_client_instance):
        result = lead_scoring.score_lead_sync({
            "industry": "construction", "company_size": "100", "city": "Milwaukee", "state": "WI",
        })

    # Must not raise — falls back to the heuristic and says so in the reasoning.
    assert result["tier"] in {"hot", "warm", "cold"}
    assert "Groq scoring failed" in result["reasoning"]


@pytest.mark.asyncio
async def test_score_lead_async_wrapper_works():
    result = await lead_scoring.score_lead({
        "industry": "construction", "company_size": "100", "city": "Milwaukee", "state": "WI",
    })
    assert result["tier"] in {"hot", "warm", "cold"}


# ─── Dedup: domain + fuzzy company-name matching ────────────────────────────

def test_normalize_domain_strips_protocol_and_www():
    assert lead_dedup.normalize_domain("https://www.Example.com/careers") == "example.com"
    assert lead_dedup.normalize_domain("EXAMPLE.COM") == "example.com"
    assert lead_dedup.normalize_domain(None) is None


def test_normalize_company_name_strips_suffixes_case_and_whitespace():
    assert lead_dedup.normalize_company_name("Acme Construction, LLC") == "acme construction"
    assert lead_dedup.normalize_company_name("ACME CONSTRUCTION INC.") == "acme construction"
    assert lead_dedup.normalize_company_name("  Acme   Construction   Co  ") == "acme construction"


def test_is_fuzzy_duplicate_matches_near_variants():
    assert lead_dedup.is_fuzzy_duplicate("Acme Construction LLC", "Acme Construction Inc")
    assert lead_dedup.is_fuzzy_duplicate("Acme Construction", "ACME CONSTRUCTION CO.")
    assert not lead_dedup.is_fuzzy_duplicate("Acme Construction", "Zenith Staffing Solutions")


@pytest.mark.asyncio
async def test_find_duplicate_lead_matches_by_domain(db_session):
    existing = Lead(id=uuid.uuid4(), company_name="Acme Construction LLC", domain="acmeconstruction.com")
    db_session.add(existing)
    await db_session.commit()

    match = await lead_dedup.find_duplicate_lead(db_session, "Acme Construction Inc (new name)", "acmeconstruction.com")
    assert match is not None
    assert match.id == existing.id


@pytest.mark.asyncio
async def test_find_duplicate_lead_matches_by_fuzzy_company_name_when_no_domain(db_session):
    existing = Lead(id=uuid.uuid4(), company_name="Great Lakes Mechanical Contracting", domain=None)
    db_session.add(existing)
    await db_session.commit()

    match = await lead_dedup.find_duplicate_lead(db_session, "Great Lakes Mechanical Contracting Inc", None)
    assert match is not None
    assert match.id == existing.id


@pytest.mark.asyncio
async def test_find_duplicate_lead_returns_none_for_genuinely_new_company(db_session):
    existing = Lead(id=uuid.uuid4(), company_name="Acme Construction LLC", domain="acmeconstruction.com")
    db_session.add(existing)
    await db_session.commit()

    match = await lead_dedup.find_duplicate_lead(db_session, "Totally Different Staffing Group", "totallydifferent.com")
    assert match is None


# ─── Suppression list: a suppressed email must NEVER be sent to ────────────

@pytest.mark.asyncio
async def test_send_lead_outreach_email_blocks_suppressed_recipient(db_session, monkeypatch):
    # Allowlist would otherwise allow this recipient — suppression must still block it.
    monkeypatch.setattr(allowlist, "ALLOWED_EMAILS", {"blocked@suppressed.com"})

    lead = Lead(id=uuid.uuid4(), company_name="Suppressed Co", contact_email="blocked@suppressed.com")
    db_session.add(lead)
    db_session.add(LeadEmailSuppression(id=uuid.uuid4(), email="blocked@suppressed.com", reason="unsubscribed"))
    await db_session.commit()

    with patch("services.lead_outreach.SendGridAPIClient") as mock_sg_cls:
        result = await lead_outreach.send_lead_outreach_email(db_session, lead, "intro")

    assert result["success"] is False
    assert "suppression" in result["error"].lower()
    mock_sg_cls.assert_not_called()  # SendGrid must never even be constructed


@pytest.mark.asyncio
async def test_add_suppression_is_enforced_immediately_after_being_added(db_session, monkeypatch):
    monkeypatch.setattr(allowlist, "ALLOWED_EMAILS", {"willbe@suppressed.com"})
    monkeypatch.setenv("SENDGRID_API_KEY", "fake-key-for-test")

    lead = Lead(id=uuid.uuid4(), company_name="Will Suppress Co", contact_email="willbe@suppressed.com")
    db_session.add(lead)
    await db_session.commit()

    # Before suppression: send would proceed to the SendGrid call (allowlist passes).
    with patch("services.lead_outreach.SendGridAPIClient") as mock_sg_cls:
        mock_sg_cls.return_value.send.return_value = MagicMock(status_code=202, headers={"X-Message-Id": "abc"})
        result_before = await lead_outreach.send_lead_outreach_email(db_session, lead, "intro")
    assert result_before["success"] is True
    await db_session.commit()

    # Now suppress, and confirm the very next send is blocked and SendGrid is untouched.
    await lead_outreach.add_suppression(db_session, "willbe@suppressed.com", reason="manual")
    await db_session.commit()

    with patch("services.lead_outreach.SendGridAPIClient") as mock_sg_cls_2:
        result_after = await lead_outreach.send_lead_outreach_email(db_session, lead, "intro")

    assert result_after["success"] is False
    mock_sg_cls_2.assert_not_called()


# ─── Allowlist enforcement: a non-allowlisted recipient must never trigger a
# real SendGrid call, regardless of suppression state ────────────────────────

@pytest.mark.asyncio
async def test_send_lead_outreach_email_blocks_non_allowlisted_recipient(db_session, monkeypatch):
    monkeypatch.setattr(allowlist, "ALLOWED_EMAILS", {"someone-else@example.com"})
    monkeypatch.setenv("SENDGRID_API_KEY", "fake-key-for-test")

    lead = Lead(id=uuid.uuid4(), company_name="Not Allowlisted Co", contact_email="not-allowlisted@example.com")
    db_session.add(lead)
    await db_session.commit()

    with patch("services.lead_outreach.SendGridAPIClient") as mock_sg_cls:
        result = await lead_outreach.send_lead_outreach_email(db_session, lead, "intro")

    assert result["success"] is False
    assert "allowlist" in result["error"].lower() or "blocked" in result["error"].lower()
    mock_sg_cls.assert_not_called()


def test_allowlist_blocks_unlisted_email_and_phone_at_source(monkeypatch):
    monkeypatch.setattr(allowlist, "ALLOWED_EMAILS", {"ok@example.com"})
    monkeypatch.setattr(allowlist, "ALLOWED_PHONES", {"4145551234"})

    assert allowlist.is_email_allowed("ok@example.com") is True
    assert allowlist.is_email_allowed("not-ok@example.com") is False
    assert allowlist.is_sms_allowed("+14145551234") is True
    assert allowlist.is_sms_allowed("+19995559999") is False


@pytest.mark.asyncio
async def test_allowed_recipient_that_is_not_suppressed_actually_sends(db_session, monkeypatch):
    """Positive control: proves the gates aren't blocking everything unconditionally —
    an allowlisted, non-suppressed recipient DOES reach the (mocked) SendGrid call."""
    monkeypatch.setattr(allowlist, "ALLOWED_EMAILS", {"allowed@example.com"})
    monkeypatch.setenv("SENDGRID_API_KEY", "fake-key-for-test")

    lead = Lead(id=uuid.uuid4(), company_name="Allowed Co", contact_email="allowed@example.com")
    db_session.add(lead)
    await db_session.commit()

    with patch("services.lead_outreach.SendGridAPIClient") as mock_sg_cls:
        mock_sg_cls.return_value.send.return_value = MagicMock(status_code=202, headers={"X-Message-Id": "xyz"})
        result = await lead_outreach.send_lead_outreach_email(db_session, lead, "intro")

    assert result["success"] is True
    mock_sg_cls.return_value.send.assert_called_once()


# ─── Unsubscribe tokens ──────────────────────────────────────────────────────

def test_unsubscribe_token_roundtrip():
    token = lead_outreach.generate_unsubscribe_token("Someone@Example.com")
    assert lead_outreach.verify_unsubscribe_token(token) == "someone@example.com"


def test_unsubscribe_token_rejects_tampering():
    token = lead_outreach.generate_unsubscribe_token("victim@example.com")
    payload, _, sig = token.partition(".")
    forged = lead_outreach.generate_unsubscribe_token("attacker@example.com").partition(".")[0] + "." + sig
    assert lead_outreach.verify_unsubscribe_token(forged) is None
    assert lead_outreach.verify_unsubscribe_token("garbage") is None
