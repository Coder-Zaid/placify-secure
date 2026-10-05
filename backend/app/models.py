from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON, Index
from sqlalchemy.orm import relationship
import datetime
from database import Base

# ============================================================================
# PYDANTIC MODEL SCHEMAS
# ============================================================================

class QuestionSchema(BaseModel):
    type: str  # mcq, true_false, short_answer, long_answer, coding
    question: str
    options: Optional[List[str]] = None
    answer: Optional[str] = None
    points: int = 1
    negative_marking: float = 0.0
    image_url: Optional[str] = None

class SecurityPolicySchema(BaseModel):
    fullscreen_required: bool = True
    single_tab: bool = True
    disable_copy: bool = True
    disable_paste: bool = True
    disable_cut: bool = True
    disable_print: bool = True
    disable_right_click: bool = True
    disable_selection: bool = True
    disable_refresh: bool = True
    disable_back_navigation: bool = True
    detect_dev_tools: bool = True
    detect_fullscreen_exit: bool = True
    detect_tab_switch: bool = True
    detect_window_blur: bool = False
    detect_window_minimize: bool = True
    detect_extension_removal: bool = True
    detect_phone: bool = False
    max_warnings: int = 4
    grace_period_seconds: int = 3

class CreateAssessmentRequest(BaseModel):
    title: str
    description: str = ""
    created_by: Optional[str] = "admin"
    duration_minutes: int = 30
    passing_score: int = 50
    max_attempts: int = 1
    randomize_questions: bool = False
    shuffle_options: bool = False
    questions: List[QuestionSchema] = []
    security_policy: Optional[SecurityPolicySchema] = None

class UpdateAssessmentRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    passing_score: Optional[int] = None
    max_attempts: Optional[int] = None
    randomize_questions: Optional[bool] = None
    shuffle_options: Optional[bool] = None
    questions: Optional[List[QuestionSchema]] = None
    security_policy: Optional[SecurityPolicySchema] = None

class StartAttemptRequest(BaseModel):
    student_name: str
    student_email: str
    roll_number: Optional[str] = ""

class SyncResponsesRequest(BaseModel):
    attempt_id: str
    responses: Dict[str, str]

class SubmitAttemptRequest(BaseModel):
    attempt_id: str
    responses: Dict[str, str]  # question_index -> answer

class RecoverAttemptRequest(BaseModel):
    attempt_id: str
    student_name: str
    student_email: str
    roll_number: Optional[str] = ""
    score: Optional[float] = None
    status: Optional[str] = "completed"
    responses: Optional[Dict[str, Any]] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    warning_count: Optional[int] = 0
    violation_count: Optional[int] = 0

class ViolationEventRequest(BaseModel):
    attempt_id: str
    event_type: str  # tab_switch, fullscreen_exit, window_blur, dev_tools, extension_removed, phone_detected, etc.
    duration_seconds: float = 0.0
    browser: str = ""
    os: str = ""
    fullscreen_status: bool = True
    snapshot_data: Optional[str] = None

class InstructorRegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class InstructorLoginRequest(BaseModel):
    email: str
    password: str


# ============================================================================
# SQLALCHEMY DATABASE MODELS
# ============================================================================

class DBAssessment(Base):
    __tablename__ = "assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    duration_minutes = Column(Integer, default=30)
    passing_score = Column(Integer, default=50)
    max_attempts = Column(Integer, default=1)
    randomize_questions = Column(Boolean, default=False)
    shuffle_options = Column(Boolean, default=False)
    status = Column(String, default="draft")  # draft, published, closed
    access_code = Column(String, unique=True, index=True, nullable=True)
    created_by = Column(String, default="admin", nullable=True)  # Instructor email or admin
    security_policy = Column(JSON, default=dict)
    questions = Column(JSON, default=list)  # List of question dicts
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    attempts = relationship("DBStudentAttempt", back_populates="assessment", cascade="all, delete-orphan")


class DBStudentAttempt(Base):
    __tablename__ = "student_attempts"
    __table_args__ = (
        # Hot-path index: duplicate attempt check on start
        Index('ix_attempts_assessment_email', 'assessment_id', 'student_email'),
        # Hot-path index: analytics/monitor queries filter by status
        Index('ix_attempts_assessment_status', 'assessment_id', 'status'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(String, unique=True, index=True, nullable=False)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), index=True)
    student_name = Column(String, nullable=False)
    student_email = Column(String, nullable=False, index=True)
    roll_number = Column(String, default="", nullable=True)
    status = Column(String, default="in_progress", index=True)  # in_progress, completed, terminated
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True)
    total_points = Column(Float, default=0)
    warning_count = Column(Integer, default=0)
    violation_count = Column(Integer, default=0)
    responses = Column(JSON, default=dict)
    
    assessment = relationship("DBAssessment", back_populates="attempts")
    violations = relationship("DBViolationLog", back_populates="attempt", cascade="all, delete-orphan")


class DBViolationLog(Base):
    __tablename__ = "violation_logs"
    __table_args__ = (
        # Hot-path index: fetch violations by attempt
        Index('ix_violations_attempt_id', 'attempt_id'),
        # Index for filtering by event type (phone_detected queries)
        Index('ix_violations_attempt_event', 'attempt_id', 'event_type'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(String, ForeignKey("student_attempts.attempt_id"), index=True)
    event_type = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    duration_seconds = Column(Float, default=0.0)
    browser = Column(String, default="")
    os = Column(String, default="")
    fullscreen_status = Column(Boolean, default=True)
    snapshot_data = Column(Text, nullable=True)  # Base64 camera evidence
    
    attempt = relationship("DBStudentAttempt", back_populates="violations")


class DBInstructor(Base):
    __tablename__ = "instructors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="instructor")  # "admin" or "instructor"
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
