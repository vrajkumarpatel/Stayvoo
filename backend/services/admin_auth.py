import os
import secrets
from fastapi import Header, HTTPException

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    raise RuntimeError(
        "ADMIN_PASSWORD environment variable is not set. Refusing to start "
        "without an admin password rather than falling back to a default."
    )


def verify_admin(x_admin_password: str = Header(...)) -> None:
    if not secrets.compare_digest(x_admin_password, ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Unauthorized")
