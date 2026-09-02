from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import datetime
import uuid
import random
import string

from database import get_db
from models import (
    DBAssessment, DBStudentAttempt, DBViolationLog,
    CreateAssessmentRequest, UpdateAssessmentRequest,
    StartAttemptRequest, SubmitAttemptRequest, ViolationEventRequest,
    SyncResponsesRequest, SecurityPolicySchema
)

router = APIRouter(prefix="/assessment", tags=["assessment"])


def generate_access_code(length=8):
    """Generate a unique alphanumeric access code."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))


# ============================================================================
# TEMPLATES
# ============================================================================

ASSESSMENT_TEMPLATES = [
    {
        "id": "aptitude_basic",
        "title": "Sample Aptitude Assessment",
        "description": "Basic aptitude test covering data structures, SQL, HTTP, and JavaScript fundamentals.",
        "duration_minutes": 10,
        "passing_score": 60,
        "questions": [
            {
                "type": "mcq",
                "question": "What is the time complexity of Binary Search?",
                "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
                "answer": "O(log n)",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "Which data structure follows FIFO?",
                "options": ["Stack", "Queue", "Tree", "Heap"],
                "answer": "Queue",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "Which SQL statement retrieves data?",
                "options": ["INSERT", "UPDATE", "SELECT", "DELETE"],
                "answer": "SELECT",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "Which HTTP method updates an existing resource?",
                "options": ["GET", "POST", "PUT", "OPTIONS"],
                "answer": "PUT",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "Which JavaScript method converts JSON into an object?",
                "options": ["JSON.parse()", "JSON.stringify()", "Object.parse()", "JSON.convert()"],
                "answer": "JSON.parse()",
                "points": 2,
                "negative_marking": 0.0
            }
        ]
    },
    {
        "id": "python_fundamentals",
        "title": "Python Fundamentals",
        "description": "Test core Python knowledge including data types, control flow, and OOP concepts.",
        "duration_minutes": 15,
        "passing_score": 50,
        "questions": [
            {
                "type": "mcq",
                "question": "Which of the following is immutable in Python?",
                "options": ["List", "Dictionary", "Set", "Tuple"],
                "answer": "Tuple",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "true_false",
                "question": "Python supports multiple inheritance.",
                "options": ["True", "False"],
                "answer": "True",
                "points": 1,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "What does the 'self' keyword refer to in Python?",
                "options": ["The class itself", "The current instance", "A global variable", "A built-in function"],
                "answer": "The current instance",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "short_answer",
                "question": "What built-in function returns the length of a list?",
                "options": [],
                "answer": "len",
                "points": 1,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "Which keyword is used to handle exceptions in Python?",
                "options": ["catch", "except", "handle", "error"],
                "answer": "except",
                "points": 2,
                "negative_marking": 0.0
            }
        ]
    },
    {
        "id": "cognitive_aptitude",
        "title": "Cognitive & Aptitude Assessment",
        "description": "Comprehensive cognitive evaluation across Quantitative Aptitude, Logical Reasoning, Blood Relations, Data Sufficiency, and Verbal Ability.",
        "duration_minutes": 30,
        "passing_score": 60,
        "questions": [
            {
                "type": "mcq",
                "question": "What is the unit digit in (4137!)^74342?",
                "options": ["7", "9", "3", "0"],
                "answer": "0",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "If 90% of A = 50% of B and B = x% of A, then the value of x is",
                "options": ["140", "160", "170", "180"],
                "answer": "180",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "Nikhil’s salary was decreased by 10% and subsequently increased by 10%, How much percent does he lose?",
                "options": ["0%", "1%", "2%", "4%"],
                "answer": "1%",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "Find the ratio of Cp and Sp, If loss % is 20%?",
                "options": ["10:7", "7:10", "5:4", "9:5"],
                "answer": "5:4",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "Aman and Bhanu can do a piece of work in 50 days. With the help of Chandhu, they can finish it in 30 days. How long will Chandhu take to finish it alone?",
                "options": ["50", "75", "150", "200"],
                "answer": "75",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "If the word “CODING” is represented as “DPEJOH”, then the word “CURFEW” will be represented as:",
                "options": ["DVSGFX", "DVSHFX", "DGSHFX", "DTSGFY"],
                "answer": "DVSGFX",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "Choose the option that completes the given series: 95, 115.5, 138, ?, 189.",
                "options": ["154.5", "162.5", "164.5", "166.5"],
                "answer": "162.5",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "Ram told Lakshman, ‘Yesterday, I met the only brother of the daughter of my grandmother.’ Whom did Rama meet?",
                "options": ["Uncle", "Father", "Father-in-law", "Either a or b"],
                "answer": "Either a or b",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "What is the distance from City A to City C?\nI. City A is 90 km from City B\nII. City B is 30 km from City C",
                "options": [
                    "Statement 1 alone is sufficient",
                    "Statement 2 alone is sufficient",
                    "Both the statements are required",
                    "Data Insufficient"
                ],
                "answer": "Data Insufficient",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "Identify the error(s) in the following sentence, if any: One of the students (A) / must give (B) / their oral report (C) / tomorrow. (D)",
                "options": ["A", "B", "C", "D"],
                "answer": "C",
                "points": 2,
                "negative_marking": 0.0
            },
            {
                "type": "mcq",
                "question": "Mithun will do anything he can to squirrel out of going to school.",
                "options": [
                    "manage to escape.",
                    "manage to enter.",
                    "to save money to do an act.",
                    "to jump out."
                ],
                "answer": "manage to escape.",
                "points": 2,
                "negative_marking": 0.0
            }
        ]
    }
]


# ============================================================================
# ASSESSMENT CRUD
# ============================================================================

@router.get("/templates")
async def get_templates():
    return {"templates": ASSESSMENT_TEMPLATES}


@router.post("/create")
async def create_assessment(request: CreateAssessmentRequest, db: Session = Depends(get_db)):
    try:
        security = request.security_policy or SecurityPolicySchema()
        
        assessment = DBAssessment(
            title=request.title,
            description=request.description,
            duration_minutes=request.duration_minutes,
            passing_score=request.passing_score,
            max_attempts=request.max_attempts,
            randomize_questions=request.randomize_questions,
            shuffle_options=request.shuffle_options,
            status="draft",
            security_policy=security.dict(),
            questions=[q.dict() for q in request.questions],
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow()
        )
        
        db.add(assessment)
        db.commit()
        db.refresh(assessment)
        
        return {
            "id": assessment.id,
            "title": assessment.title,
            "status": assessment.status,
            "question_count": len(assessment.questions),
            "created_at": assessment.created_at.isoformat()
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create assessment: {str(e)}")


@router.get("/list")
async def list_assessments(db: Session = Depends(get_db)):
    try:
        assessments = db.query(DBAssessment).order_by(DBAssessment.created_at.desc()).all()
        results = []
        for a in assessments:
            attempt_count = db.query(DBStudentAttempt).filter(
                DBStudentAttempt.assessment_id == a.id
            ).count()
            completed_count = db.query(DBStudentAttempt).filter(
                DBStudentAttempt.assessment_id == a.id,
                DBStudentAttempt.status.in_(["completed", "terminated"])
            ).count()
            
            results.append({
                "id": a.id,
                "title": a.title,
                "description": a.description,
                "duration_minutes": a.duration_minutes,
                "passing_score": a.passing_score,
                "status": a.status,
                "access_code": a.access_code,
                "question_count": len(a.questions) if a.questions else 0,
                "attempt_count": attempt_count,
                "completed_count": completed_count,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "updated_at": a.updated_at.isoformat() if a.updated_at else None
            })
        
        return {"assessments": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list assessments: {str(e)}")


@router.get("/{assessment_id}")
async def get_assessment(assessment_id: int, db: Session = Depends(get_db)):
    assessment = db.query(DBAssessment).filter(DBAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    return {
        "id": assessment.id,
        "title": assessment.title,
        "description": assessment.description,
        "duration_minutes": assessment.duration_minutes,
        "passing_score": assessment.passing_score,
        "max_attempts": assessment.max_attempts,
        "randomize_questions": assessment.randomize_questions,
        "shuffle_options": assessment.shuffle_options,
        "status": assessment.status,
        "access_code": assessment.access_code,
        "security_policy": assessment.security_policy,
        "questions": assessment.questions,
        "created_at": assessment.created_at.isoformat() if assessment.created_at else None,
        "updated_at": assessment.updated_at.isoformat() if assessment.updated_at else None
    }


@router.put("/update/{assessment_id}")
async def update_assessment(assessment_id: int, request: UpdateAssessmentRequest, db: Session = Depends(get_db)):
    assessment = db.query(DBAssessment).filter(DBAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    if assessment.status == "published":
        raise HTTPException(status_code=400, detail="Cannot edit a published assessment. Close it first.")
    
    try:
        if request.title is not None:
            assessment.title = request.title
        if request.description is not None:
            assessment.description = request.description
        if request.duration_minutes is not None:
            assessment.duration_minutes = request.duration_minutes
        if request.passing_score is not None:
            assessment.passing_score = request.passing_score
        if request.max_attempts is not None:
            assessment.max_attempts = request.max_attempts
        if request.randomize_questions is not None:
            assessment.randomize_questions = request.randomize_questions
        if request.shuffle_options is not None:
            assessment.shuffle_options = request.shuffle_options
        if request.questions is not None:
            assessment.questions = [q.dict() for q in request.questions]
        if request.security_policy is not None:
            assessment.security_policy = request.security_policy.dict()
        
        assessment.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(assessment)
        
        return {"id": assessment.id, "title": assessment.title, "status": assessment.status}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update assessment: {str(e)}")


@router.delete("/delete/{assessment_id}")
async def delete_assessment(assessment_id: int, db: Session = Depends(get_db)):
    assessment = db.query(DBAssessment).filter(DBAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    try:
        db.delete(assessment)
        db.commit()
        return {"deleted": True, "id": assessment_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete assessment: {str(e)}")


@router.post("/publish/{assessment_id}")
async def publish_assessment(assessment_id: int, db: Session = Depends(get_db)):
    assessment = db.query(DBAssessment).filter(DBAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    if not assessment.questions or len(assessment.questions) == 0:
        raise HTTPException(status_code=400, detail="Cannot publish an assessment with no questions")
    
    try:
        for _ in range(10):
            code = generate_access_code()
            existing = db.query(DBAssessment).filter(DBAssessment.access_code == code).first()
            if not existing:
                break
        
        assessment.status = "published"
        assessment.access_code = code
        assessment.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(assessment)
        
        return {
            "id": assessment.id,
            "status": "published",
            "access_code": assessment.access_code
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to publish assessment: {str(e)}")


@router.post("/close/{assessment_id}")
async def close_assessment(assessment_id: int, db: Session = Depends(get_db)):
    assessment = db.query(DBAssessment).filter(DBAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    assessment.status = "closed"
    assessment.updated_at = datetime.datetime.utcnow()
    db.commit()
    
    return {"id": assessment.id, "status": "closed"}


# ============================================================================
# STUDENT EXAM FLOW
# ============================================================================

@router.get("/join/{access_code}")
async def join_assessment(access_code: str, db: Session = Depends(get_db)):
    assessment = db.query(DBAssessment).filter(
        DBAssessment.access_code == access_code
    ).first()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Invalid access code")
    
    if assessment.status != "published":
        raise HTTPException(status_code=400, detail="This assessment is no longer active")
    
    return {
        "id": assessment.id,
        "title": assessment.title,
        "description": assessment.description,
        "duration_minutes": assessment.duration_minutes,
        "question_count": len(assessment.questions) if assessment.questions else 0,
        "security_policy": assessment.security_policy,
        "max_attempts": assessment.max_attempts
    }


@router.post("/{assessment_id}/start")
async def start_attempt(assessment_id: int, request: StartAttemptRequest, db: Session = Depends(get_db)):
    assessment = db.query(DBAssessment).filter(DBAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    if assessment.status != "published":
        raise HTTPException(status_code=400, detail="This assessment is not currently active")
    
    existing_attempts = db.query(DBStudentAttempt).filter(
        DBStudentAttempt.assessment_id == assessment_id,
        DBStudentAttempt.student_email == request.student_email
    ).count()
    
    if existing_attempts >= assessment.max_attempts:
        raise HTTPException(status_code=400, detail="Maximum number of attempts reached")
    
    active_attempt = db.query(DBStudentAttempt).filter(
        DBStudentAttempt.assessment_id == assessment_id,
        DBStudentAttempt.student_email == request.student_email,
        DBStudentAttempt.status == "in_progress"
    ).first()
    
    if active_attempt:
        raise HTTPException(status_code=400, detail="You already have an active attempt")
    
    try:
        attempt_id = str(uuid.uuid4())[:12]
        total_points = sum(q.get("points", 1) for q in assessment.questions) if assessment.questions else 0
        
        questions = list(assessment.questions) if assessment.questions else []
        if assessment.randomize_questions:
            random.shuffle(questions)
        
        student_questions = []
        for i, q in enumerate(questions):
            sq = {
                "index": i,
                "type": q["type"],
                "question": q["question"],
                "points": q.get("points", 1)
            }
            if q.get("options"):
                opts = list(q["options"])
                if assessment.shuffle_options and q["type"] in ["mcq", "true_false"]:
                    random.shuffle(opts)
                sq["options"] = opts
            student_questions.append(sq)
        
        attempt = DBStudentAttempt(
            attempt_id=attempt_id,
            assessment_id=assessment_id,
            student_name=request.student_name,
            student_email=request.student_email,
            roll_number=request.roll_number or "",
            status="in_progress",
            start_time=datetime.datetime.utcnow(),
            total_points=total_points,
            responses={}
        )
        
        db.add(attempt)
        db.commit()
        db.refresh(attempt)
        
        return {
            "attempt_id": attempt_id,
            "assessment_title": assessment.title,
            "duration_minutes": assessment.duration_minutes,
            "total_points": total_points,
            "questions": student_questions,
            "security_policy": assessment.security_policy
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to start attempt: {str(e)}")


@router.post("/{assessment_id}/sync")
async def sync_attempt_responses(assessment_id: int, request: SyncResponsesRequest, db: Session = Depends(get_db)):
    """Save in-progress student answers in real-time so admin can view updates live."""
    attempt = db.query(DBStudentAttempt).filter(
        DBStudentAttempt.attempt_id == request.attempt_id,
        DBStudentAttempt.assessment_id == assessment_id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    if attempt.status == "in_progress":
        attempt.responses = request.responses
        db.commit()
    
    return {"synced": True, "answer_count": len(request.responses)}


@router.post("/{assessment_id}/submit")
async def submit_attempt(assessment_id: int, request: SubmitAttemptRequest, db: Session = Depends(get_db)):
    attempt = db.query(DBStudentAttempt).filter(
        DBStudentAttempt.attempt_id == request.attempt_id,
        DBStudentAttempt.assessment_id == assessment_id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    if attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="This attempt has already been submitted")
    
    assessment = db.query(DBAssessment).filter(DBAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    try:
        score = 0.0
        total_points = 0.0
        questions = assessment.questions or []
        graded_responses = {}
        
        for i, q in enumerate(questions):
            idx = str(i)
            total_points += q.get("points", 1)
            student_answer = request.responses.get(idx, "").strip()
            correct_answer = q.get("answer", "").strip()
            
            is_correct = False
            if q["type"] in ["mcq", "true_false"]:
                is_correct = student_answer.lower() == correct_answer.lower()
            elif q["type"] == "short_answer":
                is_correct = student_answer.lower().strip() == correct_answer.lower().strip()
            elif q["type"] in ["long_answer", "coding"]:
                is_correct = len(student_answer) > 10
            
            if is_correct:
                score += q.get("points", 1)
            elif student_answer and q.get("negative_marking", 0) > 0:
                score -= q.get("negative_marking", 0)
            
            graded_responses[idx] = {
                "answer": student_answer,
                "correct": is_correct,
                "correct_answer": correct_answer,
                "points_awarded": q.get("points", 1) if is_correct else (-q.get("negative_marking", 0) if student_answer else 0)
            }
        
        score = max(0, score)
        percentage = (score / total_points * 100) if total_points > 0 else 0
        passed = percentage >= assessment.passing_score
        
        attempt.status = "completed"
        attempt.end_time = datetime.datetime.utcnow()
        attempt.score = round(percentage, 1)
        attempt.responses = graded_responses
        
        db.commit()
        db.refresh(attempt)
        
        return {
            "attempt_id": attempt.attempt_id,
            "status": "completed",
            "score": attempt.score,
            "total_points": total_points,
            "points_earned": score,
            "passed": passed,
            "passing_score": assessment.passing_score,
            "graded_responses": graded_responses,
            "completion_time": (attempt.end_time - attempt.start_time).total_seconds() if attempt.start_time else 0,
            "warning_count": attempt.warning_count,
            "violation_count": attempt.violation_count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit: {str(e)}")


@router.post("/{assessment_id}/terminate")
async def terminate_attempt(assessment_id: int, request: SubmitAttemptRequest, db: Session = Depends(get_db)):
    attempt = db.query(DBStudentAttempt).filter(
        DBStudentAttempt.attempt_id == request.attempt_id,
        DBStudentAttempt.assessment_id == assessment_id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    if attempt.status != "in_progress":
        return {"attempt_id": attempt.attempt_id, "status": attempt.status, "already_terminated": True}
    
    assessment = db.query(DBAssessment).filter(DBAssessment.id == assessment_id).first()
    
    try:
        score = 0.0
        total_points = 0.0
        questions = assessment.questions or []
        
        for i, q in enumerate(questions):
            idx = str(i)
            total_points += q.get("points", 1)
            student_answer = request.responses.get(idx, "").strip()
            correct_answer = q.get("answer", "").strip()
            
            if q["type"] in ["mcq", "true_false"]:
                if student_answer.lower() == correct_answer.lower():
                    score += q.get("points", 1)
            elif q["type"] == "short_answer":
                if student_answer.lower().strip() == correct_answer.lower().strip():
                    score += q.get("points", 1)
        
        score = max(0, score)
        percentage = (score / total_points * 100) if total_points > 0 else 0
        
        attempt.status = "terminated"
        attempt.end_time = datetime.datetime.utcnow()
        attempt.score = round(percentage, 1)
        attempt.responses = request.responses
        
        db.commit()
        
        return {
            "attempt_id": attempt.attempt_id,
            "status": "terminated",
            "score": attempt.score,
            "reason": "Repeated integrity violations detected"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to terminate: {str(e)}")


# ============================================================================
# VIOLATION LOGGING
# ============================================================================

@router.post("/{assessment_id}/violations")
async def log_violation(assessment_id: int, request: ViolationEventRequest, db: Session = Depends(get_db)):
    attempt = db.query(DBStudentAttempt).filter(
        DBStudentAttempt.attempt_id == request.attempt_id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    if attempt.status != "in_progress":
        return {"logged": False, "reason": "Attempt already ended"}
    
    assessment = db.query(DBAssessment).filter(DBAssessment.id == assessment_id).first()
    security_policy = assessment.security_policy or {}
    max_warnings = security_policy.get("max_warnings", 1)
    
    immediate_termination_events = ["dev_tools", "extension_removed", "multiple_tabs"]
    should_terminate = request.event_type in immediate_termination_events
    
    try:
        violation = DBViolationLog(
            attempt_id=request.attempt_id,
            event_type=request.event_type,
            timestamp=datetime.datetime.utcnow(),
            duration_seconds=request.duration_seconds,
            browser=request.browser,
            os=request.os,
            fullscreen_status=request.fullscreen_status
        )
        db.add(violation)
        
        attempt.violation_count += 1
        
        if should_terminate:
            action = "terminate"
        elif attempt.warning_count < max_warnings:
            attempt.warning_count += 1
            action = "warn"
        else:
            action = "terminate"
        
        db.commit()
        
        return {
            "logged": True,
            "action": action,
            "warning_count": attempt.warning_count,
            "violation_count": attempt.violation_count,
            "max_warnings": max_warnings
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to log violation: {str(e)}")


@router.get("/{assessment_id}/violations")
async def get_violations(assessment_id: int, db: Session = Depends(get_db)):
    attempts = db.query(DBStudentAttempt).filter(
        DBStudentAttempt.assessment_id == assessment_id
    ).all()
    
    all_violations = []
    for attempt in attempts:
        violations = db.query(DBViolationLog).filter(
            DBViolationLog.attempt_id == attempt.attempt_id
        ).order_by(DBViolationLog.timestamp).all()
        
        for v in violations:
            all_violations.append({
                "student_name": attempt.student_name,
                "student_email": attempt.student_email,
                "attempt_id": attempt.attempt_id,
                "event_type": v.event_type,
                "timestamp": v.timestamp.isoformat() if v.timestamp else None,
                "duration_seconds": v.duration_seconds,
                "browser": v.browser,
                "os": v.os,
                "fullscreen_status": v.fullscreen_status
            })
    
    return {"violations": all_violations, "total": len(all_violations)}


# ============================================================================
# ANALYTICS & MONITORING
# ============================================================================

@router.get("/{assessment_id}/analytics")
async def get_analytics(assessment_id: int, db: Session = Depends(get_db)):
    assessment = db.query(DBAssessment).filter(DBAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    attempts = db.query(DBStudentAttempt).filter(
        DBStudentAttempt.assessment_id == assessment_id
    ).all()
    
    total_attempts = len(attempts)
    completed = [a for a in attempts if a.status == "completed"]
    terminated = [a for a in attempts if a.status == "terminated"]
    in_progress = [a for a in attempts if a.status == "in_progress"]
    
    scores = [a.score for a in completed + terminated if a.score is not None]
    avg_score = sum(scores) / len(scores) if scores else 0
    passed_count = sum(1 for s in scores if s >= assessment.passing_score)
    
    completion_times = []
    for a in completed:
        if a.start_time and a.end_time:
            delta = (a.end_time - a.start_time).total_seconds()
            completion_times.append(delta)
    avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
    
    distribution = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    for s in scores:
        if s <= 20: distribution["0-20"] += 1
        elif s <= 40: distribution["21-40"] += 1
        elif s <= 60: distribution["41-60"] += 1
        elif s <= 80: distribution["61-80"] += 1
        else: distribution["81-100"] += 1
    
    total_violations = sum(a.violation_count for a in attempts)
    total_warnings = sum(a.warning_count for a in attempts)
    
    return {
        "assessment_title": assessment.title,
        "total_attempts": total_attempts,
        "completed": len(completed),
        "terminated": len(terminated),
        "in_progress": len(in_progress),
        "average_score": round(avg_score, 1),
        "highest_score": max(scores) if scores else 0,
        "lowest_score": min(scores) if scores else 0,
        "passed_count": passed_count,
        "failed_count": len(scores) - passed_count,
        "pass_rate": round(passed_count / len(scores) * 100, 1) if scores else 0,
        "average_completion_time": round(avg_completion_time),
        "score_distribution": distribution,
        "total_violations": total_violations,
        "total_warnings": total_warnings
    }


@router.get("/{assessment_id}/monitor")
async def monitor_assessment(assessment_id: int, db: Session = Depends(get_db)):
    assessment = db.query(DBAssessment).filter(DBAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    attempts = db.query(DBStudentAttempt).filter(
        DBStudentAttempt.assessment_id == assessment_id
    ).order_by(DBStudentAttempt.start_time.desc()).all()
    
    students = []
    for a in attempts:
        completion_time = None
        if a.start_time and a.end_time:
            completion_time = round((a.end_time - a.start_time).total_seconds())
        
        # Calculate answered questions count
        answered_count = len(a.responses or {})
        
        students.append({
            "student_name": a.student_name,
            "student_email": a.student_email,
            "roll_number": a.roll_number or "N/A",
            "attempt_id": a.attempt_id,
            "status": a.status,
            "warning_count": a.warning_count,
            "violation_count": a.violation_count,
            "completion_time": completion_time,
            "score": a.score,
            "answered_count": answered_count,
            "total_questions": len(assessment.questions or []),
            "responses": a.responses or {},
            "start_time": a.start_time.isoformat() if a.start_time else None
        })
    
    return {
        "assessment_title": assessment.title,
        "questions": assessment.questions or [],
        "students": students,
        "total": len(students)
    }
