"""
Dedup logic for inbound leads (Apollo sync, manual entry, webhook intake).

Matching strategy:
1. Exact domain match (normalized: lowercase, strip protocol/www/path) — cheapest,
   most reliable signal when both records have a domain.
2. Fuzzy company-name match (normalized: lowercase, strip punctuation, strip common
   legal suffixes like "LLC"/"Inc"/"Corp", collapse whitespace) as a fallback for
   leads with no domain (or differing domains from data-entry variance).
"""
import re
from difflib import SequenceMatcher

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Lead

_COMPANY_SUFFIXES = (
    "llc", "l l c", "inc", "incorporated", "corp", "corporation", "co",
    "company", "ltd", "limited", "llp", "lp", "pllc", "pc",
)

_FUZZY_MATCH_THRESHOLD = 0.88


def normalize_domain(domain: str | None) -> str | None:
    if not domain:
        return None
    d = domain.strip().lower()
    d = re.sub(r"^https?://", "", d)
    d = re.sub(r"^www\.", "", d)
    d = d.split("/")[0]
    d = d.strip().strip(".")
    return d or None


def normalize_company_name(name: str | None) -> str:
    if not name:
        return ""
    n = name.strip().lower()
    n = re.sub(r"[.,&/\\]", " ", n)
    n = re.sub(r"[^a-z0-9\s]", "", n)
    n = re.sub(r"\s+", " ", n).strip()

    words = n.split(" ")
    while words and words[-1] in _COMPANY_SUFFIXES:
        words.pop()
    return " ".join(words).strip()


def is_fuzzy_duplicate(name_a: str | None, name_b: str | None, threshold: float = _FUZZY_MATCH_THRESHOLD) -> bool:
    na, nb = normalize_company_name(name_a), normalize_company_name(name_b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    return SequenceMatcher(None, na, nb).ratio() >= threshold


async def find_duplicate_lead(db: AsyncSession, company_name: str | None, domain: str | None) -> Lead | None:
    """Returns the existing Lead this (company_name, domain) pair matches, or None."""
    norm_domain = normalize_domain(domain)
    if norm_domain:
        result = await db.execute(select(Lead).where(Lead.domain == norm_domain))
        match = result.scalars().first()
        if match:
            return match

    # No domain match (or no domain supplied at all) — fall back to fuzzy name match
    # against the existing lead pool. B2B lead volumes are low enough that scanning
    # the table is fine; this isn't a consumer-scale dedup problem.
    if company_name:
        result = await db.execute(select(Lead))
        for existing in result.scalars().all():
            if is_fuzzy_duplicate(company_name, existing.company_name):
                return existing

    return None
