"""
LLM-based B2B fit scoring for leads (construction firms, staffing agencies, travel-nurse
agencies, corporate travel managers) against Stayvoo's extended-stay/group hotel product,
via Groq (services/ai_chat.py shows the pattern this mirrors).

Two paths:
- GROQ_API_KEY set: ask Groq for structured JSON {tier, score, reasoning}.
- GROQ_API_KEY unset: a real weighted heuristic based on industry fit, Milwaukee/Chicago
  metro proximity, and company size fitting typical extended-stay/group booking volume —
  not a stub that always returns the same value.
"""
import os
import re
import json
import logging
import asyncio

logger = logging.getLogger(__name__)

GROQ_MODEL = "openai/gpt-oss-120b"

VALID_TIERS = {"hot", "warm", "cold"}

# ─── Heuristic fallback ──────────────────────────────────────────────────────

# Target verticals for Stayvoo's extended-stay/group product, weighted by how
# directly they map to multi-week/multi-room bookings.
_INDUSTRY_WEIGHTS = [
    (40, ("travel nurse", "travel nursing", "nurse staffing", "healthcare staffing",
          "medical staffing", "locum")),
    (38, ("construction", "general contractor", "contracting", "electrical contractor",
          "mechanical contractor", "civil engineering", "infrastructure")),
    (35, ("staffing", "staffing agency", "workforce solutions", "temp agency",
          "recruiting", "recruitment")),
    (30, ("corporate travel", "travel management", "business travel", "meetings and events",
          "event production", "relocation")),
    (15, ("logistics", "manufacturing", "energy", "utilities", "engineering",
          "field services", "oil and gas", "renewable energy")),
]

# Milwaukee-area (Stayvoo's home turf) beats broader Chicagoland/Wisconsin/Illinois,
# which still beats "somewhere else in the Midwest."
_METRO_CITIES = {
    "milwaukee", "waukesha", "brookfield", "west allis", "wauwatosa", "kenosha",
    "racine", "menomonee falls", "new berlin", "franklin", "oak creek",
}
_CHICAGOLAND_CITIES = {
    "chicago", "naperville", "aurora", "joliet", "elgin", "schaumburg",
    "evanston", "waukegan", "rockford",
}
_TARGET_STATES = {"wi", "wisconsin", "il", "illinois"}

# Rough headcount sweet spot for a company that would plausibly book 3-15 rooms for
# 1-8+ weeks (crews, staffing placements, project teams) rather than a single traveler.
_SIZE_RANGES = [
    (25, 100, 25),    # small crew/regional office — good group-booking fit
    (101, 1000, 30),  # regional/multi-site — best fit, frequent rotating crews
    (1001, 5000, 20), # large enterprise — still a fit, longer sales cycle
    (1, 24, 10),       # very small — occasional bookings at most
    (5001, 10**7, 12), # national/global — fit exists but harder to land direct
]


def _parse_company_size(raw: str | None) -> int | None:
    """Best-effort midpoint employee count from strings like '51-200', '1000+', '10 employees'."""
    if not raw:
        return None
    nums = [int(n) for n in re.findall(r"\d+", raw.replace(",", ""))]
    if not nums:
        return None
    if len(nums) >= 2:
        return (nums[0] + nums[1]) // 2
    return nums[0]


def _industry_score(industry: str | None) -> tuple[int, str]:
    if not industry:
        return 0, "no industry provided"
    low = industry.lower()
    for weight, keywords in _INDUSTRY_WEIGHTS:
        for kw in keywords:
            if kw in low:
                return weight, f"industry '{industry}' matches target vertical ({kw})"
    return 5, f"industry '{industry}' is not a core target vertical"


def _location_score(city: str | None, state: str | None) -> tuple[int, str]:
    city_low = (city or "").strip().lower()
    state_low = (state or "").strip().lower()
    if city_low in _METRO_CITIES:
        return 30, f"{city} is in Stayvoo's home Milwaukee metro"
    if city_low in _CHICAGOLAND_CITIES:
        return 25, f"{city} is in the Chicagoland corridor Stayvoo already serves"
    if state_low in _TARGET_STATES:
        return 15, f"{state} is in Stayvoo's WI/IL service footprint"
    if city or state:
        loc = f"{city or ''} {state or ''}".strip()
        return 5, f"{loc} is outside the core WI/IL footprint"
    return 0, "no location provided"


def _size_score(company_size: str | None) -> tuple[int, str]:
    midpoint = _parse_company_size(company_size)
    if midpoint is None:
        return 0, "no company size provided"
    for lo, hi, weight in _SIZE_RANGES:
        if lo <= midpoint <= hi:
            return weight, f"~{midpoint} employees fits typical extended-stay/group booking volume"
    return 5, f"~{midpoint} employees is outside the typical booking-volume sweet spot"


def score_lead_heuristic(lead_data: dict) -> dict:
    """Deterministic, real weighted heuristic. Same input always produces the same
    output (important for tests) and the weighting actually reflects Stayvoo's ICP,
    not a flat/stub value."""
    industry_pts, industry_note = _industry_score(lead_data.get("industry"))
    location_pts, location_note = _location_score(lead_data.get("city"), lead_data.get("state"))
    size_pts, size_note = _size_score(lead_data.get("company_size"))

    score = max(0, min(100, industry_pts + location_pts + size_pts))

    if score >= 70:
        tier = "hot"
    elif score >= 40:
        tier = "warm"
    else:
        tier = "cold"

    reasoning = (
        f"Heuristic score {score}/100 ({tier}). "
        f"Industry: {industry_note} (+{industry_pts}). "
        f"Location: {location_note} (+{location_pts}). "
        f"Company size: {size_note} (+{size_pts})."
    )
    return {"tier": tier, "score": score, "reasoning": reasoning}


# ─── Groq path ────────────────────────────────────────────────────────────────

_SCORING_SYSTEM_PROMPT = """You are a B2B sales-fit scoring assistant for Stayvoo, an extended-stay and \
group hotel booking specialist serving the Milwaukee, Wisconsin area and Chicagoland (Chicago, IL and \
surrounding suburbs). Stayvoo's ideal customers are companies that regularly need multiple hotel rooms \
booked for 1-8+ weeks at a time: construction firms with traveling crews, staffing agencies, travel-nurse \
agencies placing healthcare workers at hospitals, and corporate travel managers coordinating team stays.

Score the given company on fit for Stayvoo's extended-stay/group booking product, from 0-100, based on:
- Industry fit (construction, staffing, travel-nurse/healthcare-staffing, and corporate travel score highest)
- Geographic proximity to the Milwaukee, WI / Chicago, IL metro area (closer is better)
- Company size (mid-size companies with rotating field/travel staff, roughly 25-1000 employees, are the best \
fit — very small companies rarely need group bookings, very large ones have longer sales cycles)

Respond with ONLY a JSON object, no other text, in exactly this shape:
{"tier": "hot" | "warm" | "cold", "score": <integer 0-100>, "reasoning": "<one or two sentence explanation>"}
"""


def _build_user_prompt(lead_data: dict) -> str:
    return (
        f"Company: {lead_data.get('company_name', 'Unknown')}\n"
        f"Industry: {lead_data.get('industry', 'Unknown')}\n"
        f"Company size: {lead_data.get('company_size', 'Unknown')}\n"
        f"Location: {lead_data.get('city', 'Unknown')}, {lead_data.get('state', 'Unknown')}\n"
    )


def _validate_score_payload(data: dict) -> dict:
    tier = str(data.get("tier", "")).strip().lower()
    if tier not in VALID_TIERS:
        raise ValueError(f"invalid tier from model: {tier!r}")
    score = int(data.get("score"))
    if not (0 <= score <= 100):
        raise ValueError(f"score out of range: {score!r}")
    reasoning = str(data.get("reasoning", "")).strip() or "No reasoning provided."
    return {"tier": tier, "score": score, "reasoning": reasoning}


def score_lead_sync(lead_data: dict) -> dict:
    """Sync entrypoint (mirrors services/ai_chat.py's `chat()` and
    services/email_service.py's `_send_sync` — plain function, no class)."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.info("GROQ_API_KEY not set — using deterministic heuristic lead scoring")
        return score_lead_heuristic(lead_data)

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": _SCORING_SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_prompt(lead_data)},
            ],
            max_tokens=250,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        raw = completion.choices[0].message.content
        data = json.loads(raw)
        return _validate_score_payload(data)
    except Exception as e:
        logger.error("Groq lead scoring failed (%s) — falling back to heuristic", e)
        result = score_lead_heuristic(lead_data)
        result["reasoning"] = f"[Groq scoring failed, heuristic fallback used] {result['reasoning']}"
        return result


async def score_lead(lead_data: dict) -> dict:
    """Async wrapper — wraps the sync Groq/heuristic call in asyncio.to_thread, matching
    services/email_service.py's `_send`/`_send_tracked` pattern for async callers."""
    return await asyncio.to_thread(score_lead_sync, lead_data)
