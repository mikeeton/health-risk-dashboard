import argparse
from pathlib import Path
import sys
import uuid

sys.path.append(str(Path(__file__).resolve().parents[1]))

import models
from auth_utils import hash_password
from database import SessionLocal


def reset_admin(email: str, full_name: str, password: str):
    db = SessionLocal()

    try:
        user = db.query(models.User).filter(models.User.email == email.lower()).first()

        if not user:
            user = models.User(
                public_id=f"USR-{uuid.uuid4().hex[:8].upper()}",
                email=email.lower(),
                full_name=full_name.strip(),
                role="admin",
                password_hash=hash_password(password),
                status="active",
            )
            db.add(user)
        else:
            user.full_name = full_name.strip()
            user.role = "admin"
            user.password_hash = hash_password(password)
            user.status = "active"

            if not user.public_id:
                user.public_id = f"USR-{uuid.uuid4().hex[:8].upper()}"

        db.commit()
        db.refresh(user)

        return user
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Create or reset an admin user.")
    parser.add_argument("--email", default="admin@example.com")
    parser.add_argument("--full-name", default="System Admin")
    parser.add_argument("--password", required=True)

    args = parser.parse_args()
    user = reset_admin(args.email, args.full_name, args.password)

    print(f"Admin user ready: {user.email} ({user.full_name})")


if __name__ == "__main__":
    main()
