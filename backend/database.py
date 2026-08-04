from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from config import get_settings

settings = get_settings()
DATABASE_URL = settings.database_url

connect_args = {"application_name": "health-risk-dashboard"}
if settings.database_sslmode:
    connect_args["sslmode"] = settings.database_sslmode

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_timeout=settings.database_pool_timeout,
    pool_recycle=settings.database_pool_recycle_seconds,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
