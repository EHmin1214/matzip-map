"""
database.py
SQLAlchemy 설정 및 DB 세션 관리.

[사전 준비]
  pip install sqlalchemy psycopg2-binary python-dotenv

  .env 파일:
    DATABASE_URL=postgresql://user:password@localhost:5432/matzip
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/matzip"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI 의존성 주입용 DB 세션 생성."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
