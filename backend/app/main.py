from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
import sys
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("placify")

# Inject path to support absolute imports locally
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from database import engine, Base, SessionLocal
from routes import assessment, auth
from cache import response_cache
from seed import seed_database_if_empty


# ---------------------------------------------------------------------------
# Application Lifespan — start/stop response cache and ensure db seeding
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await response_cache.start()
    logger.info("Placify Secure API started — response cache active")
    
    # Auto-seed essential university assessments and approved faculty if missing
    try:
        db = SessionLocal()
        seed_database_if_empty(db)
        db.close()
    except Exception as seed_err:
        logger.error(f"Startup seed error: {seed_err}")
        
    yield
    # Shutdown
    await response_cache.stop()
    logger.info("Placify Secure API shutdown — cache flushed")


# Create tables and auto-migrate new columns
try:
    Base.metadata.create_all(bind=engine)
    # Check if columns exist in tables
    with engine.connect() as conn:
        from sqlalchemy import text
        try:
            conn.execute(text("ALTER TABLE student_attempts ADD COLUMN roll_number VARCHAR DEFAULT ''"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE assessments ADD COLUMN created_by VARCHAR DEFAULT 'admin'"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE violation_logs ADD COLUMN snapshot_data TEXT DEFAULT NULL"))
            conn.commit()
        except Exception:
            pass
        # Create indexes if they don't exist (for existing databases)
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_attempts_assessment_email ON student_attempts(assessment_id, student_email)"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_attempts_assessment_status ON student_attempts(assessment_id, status)"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_violations_attempt_event ON violation_logs(attempt_id, event_type)"))
            conn.commit()
        except Exception:
            pass
except Exception as db_err:
    logger.error(f"Database initialization failed: {db_err}")

# Create FastAPI app
app = FastAPI(
    title="Placify Secure Assessment API",
    description="Standalone backend server for secure exam monitoring and analytics",
    version="1.1.0",
    lifespan=lifespan
)

# ---------------------------------------------------------------------------
# Middleware Stack
# ---------------------------------------------------------------------------

# GZip — compress JSON responses >500 bytes (saves bandwidth for large payloads)
app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS — permit all origins seamlessly (including custom Hostinger domains)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(assessment.router)
app.include_router(auth.router)

@app.get("/")
async def root():
    return {
        "status": "active",
        "service": "Placify Secure Assessment Service",
        "version": "1.1.0"
    }

@app.get("/health")
async def health():
    """Health check with DB connectivity test for load balancer readiness."""
    try:
        from database import SessionLocal
        db = SessionLocal()
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db.close()
        return {
            "status": "healthy",
            "cache_size": response_cache.size,
            "cache_dirty": response_cache.dirty_count
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


if __name__ == "__main__":
    import uvicorn

    is_production = os.getenv("PLACIFY_ENV", "development") == "production"

    if is_production:
        # Production: multi-worker, no reload, optimized timeouts
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=int(os.getenv("PORT", "8001")),
            workers=int(os.getenv("WORKERS", "4")),
            timeout_keep_alive=30,
            access_log=False,     # Disable per-request access log for throughput
        )
    else:
        # Development: single worker, hot reload
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8001,
            reload=True,
            timeout_keep_alive=30,
        )
