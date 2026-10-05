from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import hashlib
import datetime

from database import get_db
from models import DBInstructor, InstructorRegisterRequest, InstructorLoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])

def hash_password(password: str) -> str:
    """Hash password using SHA-256."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


@router.post("/register")
async def register_instructor(request: InstructorRegisterRequest, db: Session = Depends(get_db)):
    clean_email = request.email.strip().lower()
    clean_name = request.name.strip()
    
    if not clean_name:
        raise HTTPException(status_code=400, detail="Name is required.")
        
    if not request.password or len(request.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long.")

    # Validate that email contains 'woxsen'
    if "woxsen" not in clean_email:
        raise HTTPException(
            status_code=400, 
            detail="Registration is restricted to Woxsen University faculty. Email must contain 'woxsen' (e.g. name@woxsen.edu.in)."
        )

    # Check if instructor already exists
    existing = db.query(DBInstructor).filter(DBInstructor.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An instructor with this email already exists.")

    new_instructor = DBInstructor(
        name=clean_name,
        email=clean_email,
        password_hash=hash_password(request.password),
        role="instructor",
        is_approved=False,  # Defaults to pending admin approval
        created_at=datetime.datetime.utcnow()
    )

    db.add(new_instructor)
    db.commit()
    db.refresh(new_instructor)

    return {
        "success": True,
        "message": "Registration submitted successfully! Your account is pending admin approval.",
        "instructor": {
            "id": new_instructor.id,
            "name": new_instructor.name,
            "email": new_instructor.email,
            "is_approved": new_instructor.is_approved
        }
    }


@router.post("/login")
async def login_instructor(request: InstructorLoginRequest, db: Session = Depends(get_db)):
    clean_identifier = request.email.strip().lower()
    clean_password = request.password.strip()

    # 1. Master Admin Check (accepts admin123 or admin)
    if clean_identifier in ["admin", "admin@woxsen.edu.in"] and clean_password in ["admin123", "admin"]:
        return {
            "success": True,
            "role": "admin",
            "name": "System Administrator",
            "email": "admin@woxsen.edu.in",
            "is_approved": True,
            "token": "admin-session-token"
        }

    # 2. Database Instructor Check
    instructor = db.query(DBInstructor).filter(DBInstructor.email == clean_identifier).first()
    if not instructor:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if instructor.password_hash != hash_password(clean_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # 3. Check Approval Gate
    if not instructor.is_approved:
        raise HTTPException(
            status_code=403, 
            detail="Your Woxsen faculty account is pending Admin approval. Please contact the administrator."
        )

    return {
        "success": True,
        "role": instructor.role,
        "name": instructor.name,
        "email": instructor.email,
        "is_approved": instructor.is_approved,
        "token": f"instructor-{instructor.id}-{int(datetime.datetime.utcnow().timestamp())}"
    }


@router.get("/instructors")
async def list_instructors(db: Session = Depends(get_db)):
    """List all registered instructors for the admin approval portal."""
    instructors = db.query(DBInstructor).order_by(DBInstructor.created_at.desc()).all()
    return {
        "instructors": [
            {
                "id": inst.id,
                "name": inst.name,
                "email": inst.email,
                "role": inst.role,
                "is_approved": inst.is_approved,
                "created_at": inst.created_at.isoformat() if inst.created_at else None
            }
            for inst in instructors
        ]
    }


@router.post("/instructors/{instructor_id}/approve")
async def approve_instructor(instructor_id: int, db: Session = Depends(get_db)):
    instructor = db.query(DBInstructor).filter(DBInstructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found.")

    instructor.is_approved = True
    db.commit()
    return {
        "success": True,
        "message": f"Instructor {instructor.name} ({instructor.email}) approved successfully.",
        "instructor": {
            "id": instructor.id,
            "name": instructor.name,
            "email": instructor.email,
            "is_approved": instructor.is_approved
        }
    }


@router.post("/instructors/{instructor_id}/reject")
async def reject_instructor(instructor_id: int, db: Session = Depends(get_db)):
    instructor = db.query(DBInstructor).filter(DBInstructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found.")

    instructor.is_approved = False
    db.commit()
    return {
        "success": True,
        "message": f"Instructor {instructor.name} access revoked / set to pending.",
        "instructor": {
            "id": instructor.id,
            "name": instructor.name,
            "email": instructor.email,
            "is_approved": instructor.is_approved
        }
    }


@router.delete("/instructors/{instructor_id}")
async def delete_instructor(instructor_id: int, db: Session = Depends(get_db)):
    instructor = db.query(DBInstructor).filter(DBInstructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found.")

    db.delete(instructor)
    db.commit()
    return {"success": True, "message": f"Instructor account deleted."}
