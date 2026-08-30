import os
import time
from pathlib import Path
from typing import Generator, Dict, Any
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# Load environment variables from project root .env
root_dir = Path(__file__).resolve().parent.parent
env_path = root_dir / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:skilltwin_password@localhost:5432/skilltwin_db"
)

# Create SQLAlchemy engine
# Set connect_timeout so connection attempts fail fast if DB is unreachable
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={"connect_timeout": 1}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator:
    """FastAPI Dependency for database session management."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> Dict[str, Any]:
    """
    Test PostgreSQL database connection and report latency and status.
    """
    start_time = time.perf_counter()
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1;"))
            row = result.fetchone()
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            if row and row[0] == 1:
                return {
                    "status": "connected",
                    "latency_ms": latency_ms,
                    "database_url": DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else "configured",
                    "error": None
                }
            return {
                "status": "unexpected_result",
                "latency_ms": latency_ms,
                "error": "Query returned unexpected value"
            }
    except Exception as e:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "disconnected",
            "latency_ms": latency_ms,
            "error": str(e),
            "database_url": DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else "configured"
        }


def init_db():
    """Execute initial schema.sql file if database is connected."""
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    if not schema_path.exists():
        return
    try:
        with engine.connect() as connection:
            with open(schema_path, "r", encoding="utf-8") as f:
                sql_script = f.read()
            connection.execute(text(sql_script))
            # Auto-ensure password_hash column is present
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);"))
            connection.commit()
    except Exception as e:
        print(f"[Database Init Warning] Could not auto-apply schema.sql: {e}")
