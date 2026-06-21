import hashlib
import secrets

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from config import get_settings
from database import get_db
import models

settings = get_settings()

SECRET_KEY = settings.secret_key

ALGORITHM = settings.jwt_algorithm

ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

REFRESH_TOKEN_EXPIRE_DAYS = settings.refresh_token_expire_days

bearer_scheme = HTTPBearer(auto_error=False)


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


def get_user_from_token(token: str | None, db: Session):
    if not token:
        return None

    payload = decode_access_token(token)

    if not payload or payload.get("token_type") == "refresh":
        return None

    user_id = payload.get("user_id")
    email = payload.get("sub")

    query = db.query(models.User)

    if user_id is not None:
        user = query.filter(models.User.id == user_id).first()
    elif email:
        user = query.filter(models.User.email == email.lower()).first()
    else:
        user = None

    if not user:
        return None

    if getattr(user, "status", None) and user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active",
        )

    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = get_user_from_token(
        credentials.credentials if credentials else None,
        db,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
