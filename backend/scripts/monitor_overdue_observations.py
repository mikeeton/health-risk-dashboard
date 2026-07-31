"""Scheduled production check for missing expected health readings."""
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from database import SessionLocal
from early_warning import evaluate_overdue_observations


def main():
    db = SessionLocal()
    try:
        count = evaluate_overdue_observations(db)
        print(f"Overdue observation monitoring completed; alerts created: {count}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
