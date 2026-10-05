import os
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from pathlib import Path

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    db_path = Path(__file__).resolve().parent.parent / "placify_secure.db"
    DATABASE_URL = f"sqlite:///{db_path.as_posix()}"
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

is_sqlite = DATABASE_URL.startswith("sqlite")

# ---------------------------------------------------------------------------
# Connection Pool Configuration (tuned for 5K–6K concurrent exam takers)
# ---------------------------------------------------------------------------
# SQLite: Limited concurrency, but WAL mode + StaticPool gives best throughput
# PostgreSQL: Full connection pooling with overflow for burst capacity
# ---------------------------------------------------------------------------
if is_sqlite:
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,
        # SQLite pool configuration
        pool_size=10,
        max_overflow=20,
    )

    # Enable WAL (Write-Ahead Logging) for much better concurrent read/write
    # WAL allows readers to proceed without blocking writers and vice versa
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")       # Faster writes, safe with WAL
        cursor.execute("PRAGMA cache_size=-64000")         # 64MB page cache
        cursor.execute("PRAGMA busy_timeout=15000")        # Wait 15s on lock instead of failing
        cursor.execute("PRAGMA temp_store=MEMORY")         # Temp tables in RAM
        cursor.execute("PRAGMA mmap_size=268435456")       # 256MB memory-mapped I/O
        cursor.close()
else:
    # PostgreSQL / MySQL — full production pool
    connect_args = {}
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,          # Recycle stale connections automatically
        pool_size=20,                # Base connections kept alive
        max_overflow=40,             # Burst capacity (total = 60 connections)
        pool_recycle=300,            # Recycle connections every 5 minutes
        pool_timeout=10,             # Wait max 10s for a connection from pool
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a scoped session with automatic cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
