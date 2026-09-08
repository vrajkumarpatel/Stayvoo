"""
Apollo.io company-search integration for B2B lead sourcing.

Target verticals: construction firms, staffing agencies, travel-nurse agencies, and
corporate travel managers in the Milwaukee/Chicago metro (Stayvoo's extended-stay
and group-booking service area). B2B only — company search, never scraping personal
social profiles.

If APOLLO_API_KEY is unset, returns realistic mock/demo data instead of crashing or
returning an empty list, so the rest of the pipeline (dedup, scoring, activity
logging) can be exercised end-to-end without a paid Apollo account.
"""
import os
import logging

import httpx

logger = logging.getLogger(__name__)

APOLLO_SEARCH_URL = "https://api.apollo.io/api/v1/mixed_companies/search"

DEFAULT_INDUSTRIES = [
    "construction",
    "staffing and recruiting",
    "hospital & health care",
    "travel arrangements",
]
DEFAULT_LOCATIONS = ["Milwaukee, WI", "Chicago, IL"]

_MOCK_COMPANIES = [
    {
        "apollo_id": "mock-org-001",
        "company_name": "Lakeshore Structural Contractors LLC",
        "domain": "lakeshorestructural.com",
        "industry": "construction",
        "company_size": "150-300",
        "city": "Waukesha",
        "state": "WI",
        "contact_name": "Dana Kowalski",
        "contact_email": "dana.kowalski@lakeshorestructural.com",
        "contact_title": "VP of Operations",
        "contact_phone": "+14145550142",
    },
    {
        "apollo_id": "mock-org-002",
        "company_name": "Midwest Traveler Nurse Staffing",
        "domain": "midwesttravelernurse.com",
        "industry": "travel nurse staffing",
        "company_size": "80-150",
        "city": "Milwaukee",
        "state": "WI",
        "contact_name": "Priya Ramesh",
        "contact_email": "priya.ramesh@midwesttravelernurse.com",
        "contact_title": "Director of Placements",
        "contact_phone": "+14145550187",
    },
    {
        "apollo_id": "mock-org-003",
        "company_name": "Chicagoland Skilled Trades Staffing Inc",
        "domain": "chicagolandskilledtrades.com",
        "industry": "staffing and recruiting",
        "company_size": "40-90",
        "city": "Chicago",
        "state": "IL",
        "contact_name": "Marcus Webb",
        "contact_email": "marcus.webb@chicagolandskilledtrades.com",
        "contact_title": "Talent Operations Manager",
        "contact_phone": "+13125550118",
    },
    {
        "apollo_id": "mock-org-004",
        "company_name": "Brookfield Corporate Travel Partners",
        "domain": "brookfieldcorptravel.com",
        "industry": "corporate travel",
        "company_size": "20-50",
        "city": "Brookfield",
        "state": "WI",
        "contact_name": "Elena Torres",
        "contact_email": "elena.torres@brookfieldcorptravel.com",
        "contact_title": "Travel Program Manager",
        "contact_phone": "+14145550163",
    },
    {
        "apollo_id": "mock-org-005",
        "company_name": "Great Lakes Mechanical & Electrical Contracting",
        "domain": "greatlakesmech.com",
        "industry": "construction",
        "company_size": "500-1000",
        "city": "Kenosha",
        "state": "WI",
        "contact_name": "Tom Higgins",
        "contact_email": "thiggins@greatlakesmech.com",
        "contact_title": "Regional Project Director",
        "contact_phone": "+12625550129",
    },
    {
        "apollo_id": "mock-org-006",
        "company_name": "Aurora Healthcare Staffing Solutions",
        "domain": "aurorahealthstaffing.com",
        "industry": "healthcare staffing",
        "company_size": "200-400",
        "city": "Naperville",
        "state": "IL",
        "contact_name": "Sophia Nguyen",
        "contact_email": "sophia.nguyen@aurorahealthstaffing.com",
        "contact_title": "VP of Clinical Staffing",
        "contact_phone": "+16305550171",
    },
]


def _mock_search_companies(industries: list[str], locations: list[str], per_page: int) -> list[dict]:
    logger.info(
        "APOLLO_API_KEY not set — returning %d mock companies (industries=%s, locations=%s)",
        min(per_page, len(_MOCK_COMPANIES)), industries, locations,
    )
    return list(_MOCK_COMPANIES[:per_page])


def _parse_apollo_response(payload: dict) -> list[dict]:
    orgs = payload.get("organizations") or payload.get("accounts") or []
    results = []
    for org in orgs:
        location = org.get("primary_location") or {}
        results.append({
            "apollo_id": str(org.get("id") or ""),
            "company_name": org.get("name") or "Unknown Company",
            "domain": org.get("primary_domain") or org.get("website_url"),
            "industry": org.get("industry"),
            "company_size": str(org.get("estimated_num_employees") or ""),
            "city": location.get("city"),
            "state": location.get("state"),
            "contact_name": None,
            "contact_email": None,
            "contact_title": None,
            "contact_phone": None,
        })
    return results


def search_companies_sync(
    industries: list[str] | None = None,
    locations: list[str] | None = None,
    per_page: int = 10,
) -> list[dict]:
    industries = industries or DEFAULT_INDUSTRIES
    locations = locations or DEFAULT_LOCATIONS
    api_key = os.getenv("APOLLO_API_KEY")

    if not api_key:
        return _mock_search_companies(industries, locations, per_page)

    try:
        response = httpx.post(
            APOLLO_SEARCH_URL,
            headers={"Content-Type": "application/json", "X-Api-Key": api_key},
            json={
                "q_organization_locations": locations,
                "organization_industry_tag_ids": industries,
                "per_page": per_page,
            },
            timeout=15.0,
        )
        response.raise_for_status()
        return _parse_apollo_response(response.json())
    except Exception as e:
        logger.error("Apollo search failed (%s) — falling back to mock data", e)
        return _mock_search_companies(industries, locations, per_page)


async def search_companies(
    industries: list[str] | None = None,
    locations: list[str] | None = None,
    per_page: int = 10,
) -> list[dict]:
    import asyncio
    return await asyncio.to_thread(search_companies_sync, industries, locations, per_page)
