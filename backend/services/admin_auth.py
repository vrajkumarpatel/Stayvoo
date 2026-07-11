import os
import secrets
from fastapi import Header, HTTPException


def verify_admin(x_admin_password: str = Header(...)) -> None:
    expected = os.getenv("ADMIN_PASSWORD", "admin123")
    if not secrets.compare_digest(x_admin_password, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")
