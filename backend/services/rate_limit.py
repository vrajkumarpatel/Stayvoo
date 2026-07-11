"""
Minimal in-memory sliding-window rate limiter. No Redis — this is a single-
instance Railway deployment, so an in-process dict is sufficient; it resets
on redeploy and won't coordinate across multiple instances if that ever
changes (acceptable tradeoff for a $0-budget solo project).
"""
import time
import logging
from collections import defaultdict
from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)

_hits: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> None:
    now = time.time()
    hits = _hits[key]
    cutoff = now - window_seconds
    while hits and hits[0] < cutoff:
        hits.pop(0)
    if len(hits) >= max_requests:
        logger.warning("Rate limit exceeded for %s (%d requests in %ds)", key, len(hits), window_seconds)
        raise HTTPException(status_code=429, detail="Too many requests. Please try again shortly.")
    hits.append(now)


def rate_limit_by_ip(request: Request, bucket: str, max_requests: int, window_seconds: int) -> None:
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"{bucket}:{client_ip}", max_requests, window_seconds)
