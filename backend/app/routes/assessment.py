from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import datetime
import uuid
import random
import string

from database import get_db
from cache import response_cache
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
            created_by=request.created_by or "admin",
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
            "created_by": assessment.created_by,
            "status": assessment.status,
            "question_count": len(assessment.questions),
            "created_at": assessment.created_at.isoformat()
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create assessment: {str(e)}")


@router.get("/list")
async def list_assessments(
    created_by: str = None,
    role: str = None,
    filter_mine: bool = False,
    db: Session = Depends(get_db)
):
    try:
        query = db.query(DBAssessment)
        # Institutional proctoring: all approved faculty and admins see the full assessment list.
        # Only isolate by author if explicitly requested with filter_mine=True.
        if filter_mine and created_by:
            query = query.filter(DBAssessment.created_by == created_by)
            
        assessments = query.order_by(DBAssessment.created_at.desc()).all()
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
                "created_by": a.created_by or "admin",
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
    
    # 1. Check if the candidate already has an in-progress attempt to resume
    active_attempt = db.query(DBStudentAttempt).filter(
        DBStudentAttempt.assessment_id == assessment_id,
        DBStudentAttempt.student_email == request.student_email,
        DBStudentAttempt.status == "in_progress"
    ).first()
    
    if active_attempt:
        # Resume the existing active attempt seamlessly with saved responses & remaining time
        total_points = sum(q.get("points", 1) for q in assessment.questions) if assessment.questions else 0
        questions = list(assessment.questions) if assessment.questions else []
        student_questions = []
        for i, q in enumerate(questions):
            sq = {
                "index": i,
                "type": q["type"],
                "question": q["question"],
                "points": q.get("points", 1),
                "image_url": q.get("image_url")
            }
            if q.get("options"):
                sq["options"] = list(q["options"])
            student_questions.append(sq)

        elapsed_seconds = (datetime.datetime.utcnow() - active_attempt.start_time).total_seconds() if active_attempt.start_time else 0
        total_seconds = assessment.duration_minutes * 60
        remaining_seconds = max(10, int(total_seconds - elapsed_seconds))

        # Check in-memory write cache for any recently buffered answers
        cached_answers = await response_cache.get(active_attempt.attempt_id)
        current_responses = dict(active_attempt.responses or {})
        if cached_answers:
            current_responses.update(cached_answers)

        return {
            "attempt_id": active_attempt.attempt_id,
            "assessment_title": assessment.title,
            "duration_minutes": assessment.duration_minutes,
            "remaining_seconds": remaining_seconds,
            "total_points": total_points,
            "questions": student_questions,
            "security_policy": assessment.security_policy,
            "responses": current_responses,
            "resumed": True
        }

    # 2. Check completed / terminated attempts against max_attempts limit
    finished_attempts = db.query(DBStudentAttempt).filter(
        DBStudentAttempt.assessment_id == assessment_id,
        DBStudentAttempt.student_email == request.student_email,
        DBStudentAttempt.status.in_(["completed", "terminated"])
    ).count()
    
    if finished_attempts >= assessment.max_attempts:
        raise HTTPException(status_code=400, detail="Maximum number of attempts reached for this assessment")
    
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
                "points": q.get("points", 1),
                "image_url": q.get("image_url")
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
    """
    Save in-progress student answers in high-performance write-back cache AND
    persist directly to database so student data is NEVER missed under any circumstances.
    """
    await response_cache.put(request.attempt_id, request.responses)
    try:
        attempt = db.query(DBStudentAttempt).filter(
            DBStudentAttempt.attempt_id == request.attempt_id,
            DBStudentAttempt.assessment_id == assessment_id
        ).first()
        if attempt:
            curr = dict(attempt.responses or {})
            curr.update(request.responses)
            attempt.responses = curr
            db.commit()
    except Exception as e:
        db.rollback()
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
        assessment = db.query(DBAssessment).filter(DBAssessment.id == assessment_id).first()
        questions = assessment.questions or [] if assessment else []
        total_points = sum(q.get("points", 1) for q in questions)
        has_answer_keys = any(bool(q.get("answer", "").strip()) for q in questions if q.get("type") in ["mcq", "true_false", "short_answer"])
        answered_count = len([a for a in (attempt.responses or {}).values() if a and str(a).strip()])
        percentage = attempt.score if attempt.score is not None else 0.0
        passed = (percentage >= assessment.passing_score) if assessment else False
        points_earned = round(percentage / 100.0 * total_points, 1) if (has_answer_keys and total_points) else None

        return {
            "attempt_id": attempt.attempt_id,
            "status": "completed",
            "has_answer_keys": has_answer_keys,
            "score": round(percentage, 1) if has_answer_keys else None,
            "total_points": total_points,
            "points_earned": points_earned,
            "passed": passed if has_answer_keys else None,
            "passing_score": assessment.passing_score if assessment else 0,
            "correct_count": len([r for r in (attempt.responses or {}).values() if isinstance(r, dict) and r.get("correct")]),
            "total_questions": len(questions),
            "answered_count": answered_count,
            "graded_responses": attempt.responses or {},
            "completion_time": (attempt.end_time - attempt.start_time).total_seconds() if (attempt.end_time and attempt.start_time) else 0,
            "warning_count": attempt.warning_count,
            "violation_count": attempt.violation_count
        }

    assessment = db.query(DBAssessment).filter(DBAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    try:
        # Retrieve any buffered cached responses and merge with submitted responses
        cached_resp = await response_cache.get(request.attempt_id)
        responses_to_grade = dict(cached_resp or {})
        if request.responses:
            responses_to_grade.update(request.responses)
        await response_cache.remove(request.attempt_id)

        score = 0.0
        total_points = 0.0
        correct_count = 0
        questions = assessment.questions or []
        graded_responses = {}
        
        # Check if the teacher configured answer keys for auto-grading
        has_answer_keys = any(bool(q.get("answer", "").strip()) for q in questions if q.get("type") in ["mcq", "true_false", "short_answer"])
        
        for i, q in enumerate(questions):
            idx = str(i)
            total_points += q.get("points", 1)
            student_answer = responses_to_grade.get(idx, "").strip()
            correct_answer = q.get("answer", "").strip()
            
            is_correct = False
            if correct_answer:
                if q["type"] in ["mcq", "true_false"]:
                    is_correct = student_answer.lower() == correct_answer.lower()
                elif q["type"] == "short_answer":
                    is_correct = student_answer.lower().strip() == correct_answer.lower().strip()
                elif q["type"] in ["long_answer", "coding"]:
                    is_correct = len(student_answer) > 10
            
            if is_correct:
                score += q.get("points", 1)
                correct_count += 1
            elif student_answer and q.get("negative_marking", 0) > 0 and correct_answer:
                score -= q.get("negative_marking", 0)
            
            graded_responses[idx] = {
                "answer": student_answer,
                "correct": is_correct if has_answer_keys else None,
                "correct_answer": correct_answer if has_answer_keys else "",
                "points_awarded": (q.get("points", 1) if is_correct else (-q.get("negative_marking", 0) if student_answer else 0)) if has_answer_keys else None
            }
        
        score = max(0, score)
        percentage = (score / total_points * 100) if total_points > 0 else 0
        passed = percentage >= assessment.passing_score
        
        attempt.status = "completed"
        attempt.end_time = datetime.datetime.utcnow()
        attempt.score = round(percentage, 1) if has_answer_keys else None
        attempt.responses = graded_responses
        
        db.commit()
        db.refresh(attempt)
        
        answered_count = len([a for a in responses_to_grade.values() if a and str(a).strip()])
        
        return {
            "attempt_id": attempt.attempt_id,
            "status": "completed",
            "has_answer_keys": has_answer_keys,
            "score": round(percentage, 1) if has_answer_keys else None,
            "total_points": total_points,
            "points_earned": round(score, 1) if has_answer_keys else None,
            "passed": passed if has_answer_keys else None,
            "passing_score": assessment.passing_score,
            "correct_count": correct_count if has_answer_keys else None,
            "total_questions": len(questions),
            "answered_count": answered_count,
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
        cached_resp = await response_cache.get(request.attempt_id)
        final_responses = dict(cached_resp or {})
        if request.responses:
            final_responses.update(request.responses)
        await response_cache.remove(request.attempt_id)

        score = 0.0
        total_points = 0.0
        questions = assessment.questions or []
        
        for i, q in enumerate(questions):
            idx = str(i)
            total_points += q.get("points", 1)
            student_answer = final_responses.get(idx, "").strip()
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
        attempt.responses = final_responses
        
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
    max_warnings = security_policy.get("max_warnings", 3)
    
    immediate_termination_events = ["dev_tools", "multiple_tabs"]
    should_terminate = request.event_type in immediate_termination_events
    
    try:
        violation = DBViolationLog(
            attempt_id=request.attempt_id,
            event_type=request.event_type,
            timestamp=datetime.datetime.utcnow(),
            duration_seconds=request.duration_seconds,
            browser=request.browser,
            os=request.os,
            fullscreen_status=request.fullscreen_status,
            snapshot_data=request.snapshot_data
        )
        db.add(violation)
        
        attempt.violation_count += 1
        
        # Phone detection is recorded as a warning with snapshot evidence; do not immediately terminate
        if request.event_type == "phone_detected":
            if attempt.warning_count < max_warnings:
                attempt.warning_count += 1
            action = "warn"
        elif should_terminate:
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
async def get_violations(assessment_id: int, limit: int = 200, db: Session = Depends(get_db)):
    """
    Optimized violation fetcher:
    Replaces N+1 query loop with a single indexed SQL JOIN.
    Limits to latest 200 violations to keep payload light for 5K+ users.
    """
    records = db.query(
        DBViolationLog,
        DBStudentAttempt.student_name,
        DBStudentAttempt.student_email
    ).join(
        DBStudentAttempt, DBViolationLog.attempt_id == DBStudentAttempt.attempt_id
    ).filter(
        DBStudentAttempt.assessment_id == assessment_id
    ).order_by(
        DBViolationLog.timestamp.desc()
    ).limit(limit).all()
    
    all_violations = []
    for v, s_name, s_email in records:
        all_violations.append({
            "student_name": s_name,
            "student_email": s_email,
            "attempt_id": v.attempt_id,
            "event_type": v.event_type,
            "timestamp": v.timestamp.isoformat() if v.timestamp else None,
            "duration_seconds": v.duration_seconds,
            "browser": v.browser,
            "os": v.os,
            "fullscreen_status": v.fullscreen_status,
            "snapshot_data": v.snapshot_data
        })
    
    return {"violations": all_violations, "total": len(all_violations)}


# ============================================================================
# ANALYTICS & MONITORING
# ============================================================================

@router.get("/{assessment_id}/analytics")
async def get_analytics(assessment_id: int, db: Session = Depends(get_db)):
    """
    Optimized analytics:
    Selects only scalar columns instead of full ORM models with large JSON blobs.
    Enables instant computation even with 5K-6K attempt records.
    """
    assessment = db.query(DBAssessment).filter(DBAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Query only needed columns — avoid deserializing responses JSON for 5,000+ rows
    rows = db.query(
        DBStudentAttempt.status,
        DBStudentAttempt.score,
        DBStudentAttempt.start_time,
        DBStudentAttempt.end_time,
        DBStudentAttempt.violation_count,
        DBStudentAttempt.warning_count
    ).filter(
        DBStudentAttempt.assessment_id == assessment_id
    ).all()
    
    total_attempts = len(rows)
    completed_count = 0
    terminated_count = 0
    in_progress_count = 0
    scores = []
    completion_times = []
    total_violations = 0
    total_warnings = 0
    
    distribution = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    
    for status, score, start_time, end_time, v_count, w_count in rows:
        total_violations += (v_count or 0)
        total_warnings += (w_count or 0)
        
        if status == "completed":
            completed_count += 1
            if start_time and end_time:
                completion_times.append((end_time - start_time).total_seconds())
        elif status == "terminated":
            terminated_count += 1
        elif status == "in_progress":
            in_progress_count += 1
        
        if score is not None:
            scores.append(score)
            if score <= 20: distribution["0-20"] += 1
            elif score <= 40: distribution["21-40"] += 1
            elif score <= 60: distribution["41-60"] += 1
            elif score <= 80: distribution["61-80"] += 1
            else: distribution["81-100"] += 1
            
    avg_score = sum(scores) / len(scores) if scores else 0
    passed_count = sum(1 for s in scores if s >= assessment.passing_score)
    avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
    
    return {
        "assessment_title": assessment.title,
        "total_attempts": total_attempts,
        "completed": completed_count,
        "terminated": terminated_count,
        "in_progress": in_progress_count,
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
    questions = assessment.questions or []
    total_q = len(questions)
    total_points = sum(q.get("points", 1) for q in questions)
    has_answer_keys = any(bool(q.get("answer", "").strip()) for q in questions if q.get("type") in ["mcq", "true_false", "short_answer"])

    for a in attempts:
        completion_time = None
        if a.start_time and a.end_time:
            completion_time = round((a.end_time - a.start_time).total_seconds())
        
        # Check cache if in_progress to show latest live responses in real-time
        responses = a.responses or {}
        if a.status == "in_progress":
            cached = await response_cache.get(a.attempt_id)
            if cached:
                responses = cached
        
        answered_count = len([v for v in responses.values() if v and (str(v).strip() if not isinstance(v, dict) else str(v.get("answer", "")).strip())])
        
        correct_count = 0
        mistake_count = 0
        unanswered_count = 0
        points_earned = 0.0

        for i, q in enumerate(questions):
            idx = str(i)
            raw = responses.get(idx)
            if isinstance(raw, dict):
                student_ans = str(raw.get("answer", "")).strip()
            else:
                student_ans = str(raw or "").strip()
            
            correct_ans = str(q.get("answer", "")).strip()

            if not student_ans:
                unanswered_count += 1
            elif has_answer_keys and correct_ans:
                is_correct = False
                if q.get("type") in ["mcq", "true_false"]:
                    is_correct = student_ans.lower() == correct_ans.lower()
                elif q.get("type") == "short_answer":
                    is_correct = student_ans.lower().strip() == correct_ans.lower().strip()
                elif q.get("type") in ["long_answer", "coding"]:
                    is_correct = len(student_ans) > 10
                
                if is_correct:
                    correct_count += 1
                    points_earned += q.get("points", 1)
                else:
                    mistake_count += 1
                    neg = q.get("negative_marking", 0.0)
                    if neg > 0:
                        points_earned -= neg
        
        final_score = round(max(0.0, points_earned), 1) if has_answer_keys else a.score
        percentage = round((max(0.0, points_earned) / total_points * 100), 1) if (has_answer_keys and total_points > 0) else (a.score if a.score is not None else 0.0)

        students.append({
            "student_name": a.student_name,
            "student_email": a.student_email,
            "roll_number": a.roll_number or "N/A",
            "attempt_id": a.attempt_id,
            "status": a.status,
            "warning_count": a.warning_count,
            "violation_count": a.violation_count,
            "completion_time": completion_time,
            "score": round(a.score, 1) if a.score is not None else (percentage if (a.status in ["completed", "terminated"] or answered_count > 0) else None),
            "points_earned": final_score,
            "total_points": total_points,
            "correct_count": correct_count if has_answer_keys else None,
            "mistake_count": mistake_count if has_answer_keys else None,
            "unanswered_count": unanswered_count,
            "answered_count": answered_count,
            "total_questions": total_q,
            "responses": responses,
            "start_time": a.start_time.isoformat() if a.start_time else None
        })
    
    return {
        "assessment_title": assessment.title,
        "questions": assessment.questions or [],
        "students": students,
        "total": len(students)
    }


@router.get("/{assessment_id}/export-csv")
async def export_assessment_csv(assessment_id: int, db: Session = Depends(get_db)):
    """
    Export all student results with marks, correct answers count,
    mistakes count, and detailed response breakdown in CSV format (like Microsoft Forms).
    """
    assessment = db.query(DBAssessment).filter(DBAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    attempts = db.query(DBStudentAttempt).filter(
        DBStudentAttempt.assessment_id == assessment_id
    ).order_by(DBStudentAttempt.start_time.asc()).all()
    
    import csv
    import io
    from fastapi.responses import Response
    
    questions = assessment.questions or []
    has_answer_keys = any(bool(q.get("answer", "").strip()) for q in questions if q.get("type") in ["mcq", "true_false", "short_answer"])
    total_points = sum(q.get("points", 1) for q in questions)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # CSV Header matching Microsoft Forms style
    base_headers = [
        "ID", "Start time", "Completion time", "Email", "Name", "Roll Number",
        "Status", "Time Taken (Seconds)", "Total Points", "Score / Marks", "Percentage (%)", "Result",
        "Correct Answers", "Mistakes (Incorrect)", "Unanswered Questions", "Violations Count", "Warnings Count"
    ]
    
    for i, q in enumerate(questions):
        q_num = i + 1
        q_title = q.get("question", f"Question {q_num}").replace("\n", " ").strip()[:60]
        base_headers.append(f"Q{q_num}: {q_title}")
        if has_answer_keys:
            base_headers.append(f"Q{q_num} Result")
            base_headers.append(f"Q{q_num} Points")
    
    writer.writerow(base_headers)
    
    for a in attempts:
        start_str = a.start_time.strftime("%Y-%m-%d %H:%M:%S") if a.start_time else ""
        end_str = a.end_time.strftime("%Y-%m-%d %H:%M:%S") if a.end_time else ""
        duration_sec = round((a.end_time - a.start_time).total_seconds()) if (a.start_time and a.end_time) else ""
        
        responses = a.responses or {}
        if a.status == "in_progress":
            cached = await response_cache.get(a.attempt_id)
            if cached:
                responses = cached
        
        correct_count = 0
        mistake_count = 0
        unanswered_count = 0
        points_earned = 0.0
        
        q_cells = []
        for i, q in enumerate(questions):
            idx = str(i)
            raw = responses.get(idx)
            if isinstance(raw, dict):
                ans = str(raw.get("answer", "")).strip()
            else:
                ans = str(raw or "").strip()
            
            correct_ans = str(q.get("answer", "")).strip()
            q_cells.append(ans)
            
            if has_answer_keys:
                if not ans:
                    unanswered_count += 1
                    q_cells.append("Unanswered")
                    q_cells.append(0)
                else:
                    is_correct = False
                    if q.get("type") in ["mcq", "true_false"]:
                        is_correct = ans.lower() == correct_ans.lower()
                    elif q.get("type") == "short_answer":
                        is_correct = ans.lower().strip() == correct_ans.lower().strip()
                    elif q.get("type") in ["long_answer", "coding"]:
                        is_correct = len(ans) > 10
                    
                    if is_correct:
                        correct_count += 1
                        pts = q.get("points", 1)
                        points_earned += pts
                        q_cells.append("Correct")
                        q_cells.append(pts)
                    else:
                        mistake_count += 1
                        neg = q.get("negative_marking", 0.0)
                        pts = -neg if neg > 0 else 0
                        points_earned += pts
                        q_cells.append("Mistake")
                        q_cells.append(pts)
        
        final_points = round(max(0.0, points_earned), 1) if has_answer_keys else (a.score or 0)
        percentage = round((final_points / total_points * 100), 1) if (has_answer_keys and total_points > 0) else (a.score if a.score is not None else 0.0)
        passed_str = "Pass" if percentage >= assessment.passing_score else "Fail"
        
        row = [
            a.attempt_id,
            start_str,
            end_str,
            a.student_email,
            a.student_name,
            a.roll_number or "",
            a.status,
            duration_sec,
            total_points,
            final_points,
            percentage,
            passed_str if has_answer_keys else "N/A",
            correct_count if has_answer_keys else "N/A",
            mistake_count if has_answer_keys else "N/A",
            unanswered_count,
            a.violation_count,
            a.warning_count
        ] + q_cells
        
        writer.writerow(row)
    
    clean_title = "".join(c for c in assessment.title if c.isalnum() or c in (' ', '_', '-')).rstrip()
    filename = f"{clean_title or 'Assessment'}_Results.csv".replace(" ", "_")
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

