import hashlib
import secrets
import base64
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from cryptography.fernet import Fernet, InvalidToken
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
password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)


def hash_password(password: str):
    return password_hasher.hash(password)


def verify_password(
    password: str,
    stored_password: str
):
    try:
        if stored_password.startswith("$argon2"):
            return password_hasher.verify(stored_password, password)

        # Backward compatibility for existing accounts. Successful logins are
        # transparently upgraded by `password_needs_rehash`.
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

    except (ValueError, InvalidHashError, VerifyMismatchError):
        return False


def password_needs_rehash(stored_password: str) -> bool:
    if not stored_password.startswith("$argon2"):
        return True
    try:
        return password_hasher.check_needs_rehash(stored_password)
    except InvalidHashError:
        return True


def _mfa_cipher() -> Fernet:
    configured = settings.integration_encryption_key.strip()
    if configured:
        return Fernet(configured.encode())
    derived = hashlib.sha256(f"{settings.secret_key}:mfa".encode()).digest()
    return Fernet(base64.urlsafe_b64encode(derived))


def encrypt_mfa_secret(value: str) -> str:
    return _mfa_cipher().encrypt(value.encode()).decode()


def decrypt_mfa_secret(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return _mfa_cipher().decrypt(value.encode()).decode()
    except (InvalidToken, ValueError):
        return None


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
