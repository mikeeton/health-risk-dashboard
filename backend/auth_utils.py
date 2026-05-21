import os
import hashlib
import secrets

from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from jose import jwt, JWTError

load_dotenv()

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "dev-secret"
)

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
)

REFRESH_TOKEN_EXPIRE_DAYS = int(
    os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")
)


def hash_password(password: str):
    salt = secrets.token_hex(16)

    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000,
    ).hex()

    return f"{salt}${hashed}"


def verify_password(
    password: str,
    stored_password: str
):
    try:
        salt, hashed = stored_password.split("$")

        check_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            100000,
        ).hex()

        return secrets.compare_digest(
            check_hash,
            hashed
        )

    except Exception:
        return False


def create_token(
    data: dict,
    expires_delta: timedelta
):
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + expires_delta

    to_encode.update({
        "exp": expire
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def create_access_token(data: dict):
    return create_token(
        data,
        timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )


def create_refresh_token(data: dict):
    payload = data.copy()

    payload["token_type"] = "refresh"

    return create_token(
        payload,
        timedelta(
            days=REFRESH_TOKEN_EXPIRE_DAYS
        )
    )


def decode_access_token(token: str):
    try:
        return jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

    except JWTError:
        return None