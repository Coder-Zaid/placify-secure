from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import sys

# Load environment variables
load_dotenv()

# Inject path to support absolute imports locally
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from database import engine, Base
from routes import assessment

# Create tables and auto-migrate new columns
try:
    Base.metadata.create_all(bind=engine)
    # Check if roll_number column exists in student_attempts
    with engine.connect() as conn:
        from sqlalchemy import text
        try:
            conn.execute(text("ALTER TABLE student_attempts ADD COLUMN roll_number VARCHAR DEFAULT ''"))
            conn.commit()
        except Exception:
            pass  # Column already exists
except Exception as db_err:
    print(f"Database initialization failed: {db_err}")

# Create FastAPI app
app = FastAPI(
    title="Placify Secure Assessment API",
    description="Standalone backend server for secure exam monitoring and analytics",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(assessment.router)

@app.get("/")
async def root():
    return {
        "status": "active",
        "service": "Placify Secure Assessment Service"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
