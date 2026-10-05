import json
import datetime
from sqlalchemy.orm import Session
from models import DBAssessment, DBInstructor
import hashlib

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

QUESTIONS_SET_D = [
    {
        "type": "short_answer",
        "question": "Name of the Student",
        "options": [],
        "answer": "",
        "points": 0,
        "negative_marking": 0.0
    },
    {
        "type": "short_answer",
        "question": "Roll Number",
        "options": [],
        "answer": "",
        "points": 0,
        "negative_marking": 0.0
    },
    {
        "type": "short_answer",
        "question": "Official mail ID",
        "options": [],
        "answer": "",
        "points": 0,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "School",
        "options": ["School of Business-PG", "Others"],
        "answer": "",
        "points": 0,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Section",
        "options": [
            "FS- Tigers",
            "BA-Tigers",
            "GM- Tigers",
            "GM- Rhinos",
            "GM- Panthers",
            "GM- Leopards",
            "GM-XP"
        ],
        "answer": "",
        "points": 0,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "If in a code language, COULD is written as BNTKC, how will MOULDING be written in that code?",
        "options": ["CHMFINTK", "LNTKCHMF", "LNTMCHMF", "NITKHCMF"],
        "answer": "LNTKCHMF",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": 'In a certain language, "ENTRY" is coded as "12345" and "STEADY" is coded as "931785", then find the code for the word "TENANT".',
        "options": ["956169", "196247", "352123", "312723"],
        "answer": "312723",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "A company purchases office equipment for 12,340 and insures it for 70% of its value under a business insurance policy. The equipment is completely damaged due to an unexpected incident. The insurance company settles the claim by paying only 80% of the insured amount. What percentage of the equipment's original value did the company incur as a loss?",
        "options": ["44%", "50%", "56%", "60%"],
        "answer": "44%",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "If 'water' is called 'blue', 'blue' is called 'red', 'red' is called 'white', 'white' is called 'sky', 'sky' is called 'rain', 'rain' is called 'green' and 'green' is called 'air', then which of the following is the colour of milk?",
        "options": ["Air", "Sky", "Green", "White"],
        "answer": "Sky",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": 'If the word "TEST" is coded as "UHXA", then which word will be coded as "NDWR"?',
        "options": ["MARD", "MASK", "MAKE", "MARK"],
        "answer": "MARK",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "The monthly salary of Employee X is 12.5% higher than that of Employee Y, both working in the same company. By what percentage is the salary of Employee Y less than that of Employee X?",
        "options": ["10%", "11.11%", "12.5%", "15%"],
        "answer": "11.11%",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": 'In a certain code language, "LQN PMW QTV" means "Rose is beautiful" and "BJC QTV OSD" means "Rani likes Rose". Which word in that language means "Rose"?',
        "options": ["QTV", "LQN", "BJC", "PMW"],
        "answer": "QTV",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Two students appeared for an examination. One of them secured 10 marks more than the other and his score was 60% of the sum of their marks. The marks obtained by them are:",
        "options": ["25,15", "20,30", "25,35", "30,40"],
        "answer": "20,30",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Find the unit digit of (1234567)^123456743",
        "options": ["7", "9", "3", "1"],
        "answer": "3",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "A vendor sells 60% of apples he had and throws away 15% of the remaining apples. Next day, he sells 50% of the remaining apples and throws away the rest. What % of the apples does the vendor throw away?",
        "options": ["20", "24", "17", "None of these"],
        "answer": "None of these",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "The ratio of the number of 50 paise coins and one rupee coins with Ramya is 7 : 10. If the value of the 50 paise coins with her is Rs. 140, then what is the number of one rupee coins with her?",
        "options": ["200", "300", "400", "None of these"],
        "answer": "400",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Complete the following series:\n11, 10, ?, 100, 1001, 1000, 10001",
        "options": ["101", "110", "111", "None of these"],
        "answer": "101",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Complete the following series:\n563, 647, 479, 815, ?",
        "options": ["120", "143", "386", "672"],
        "answer": "143",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Five friends have an average weight of 60. If Arjun is also included in the group, the average weight becomes 62. What is Arjun's weight?",
        "options": ["70", "72", "76", "80"],
        "answer": "72",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "A pupil's mark was wrongly entered as 73 instead of 63. Due to that, the average mark of the class increased by half a mark. The number of pupils in the class is:",
        "options": ["40", "20", "10", "None of these"],
        "answer": "20",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Complete the following series:\n165, 195, 255, 285, 345, ?, 435",
        "options": ["360", "370", "375", "390"],
        "answer": "375",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Complete the following series:\n664, 332, 340, 170, ?, 89",
        "options": ["85", "97", "178", "109"],
        "answer": "178",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Complete the following series:\nAC, FH, KM, PR, ?",
        "options": ["UW", "VW", "UX", "TV"],
        "answer": "UW",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Complete the following series:\n6 : 222 :: 7 : ?",
        "options": ["210", "336", "343", "None of these"],
        "answer": "343",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Identify the odd term:\n3, 4, 10, 32, 136, 685, 4116",
        "options": ["10", "32", "685", "4116"],
        "answer": "10",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": 'Pointing out to a man, Ravi said, "He is the only son of the woman who is the mother of the husband of my mother". Who is the man to Ravi?',
        "options": ["Son", "Father", "Daughter", "Grand Daughter"],
        "answer": "Father",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Anup introduces Rashmi as the daughter of the only sister of his father's wife. How is Rashmi related to Anup?",
        "options": ["Daughter", "Niece", "Aunt", "Cousin"],
        "answer": "Cousin",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": 'Pointing towards a person in the photograph Dhiya said, "He is the only son of the father of my sister\'s brother." How is that person related to Dhiya?',
        "options": ["Son", "Father", "Uncle", "None of the above"],
        "answer": "None of the above",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Prabir started walking towards South. He took a right turn after walking 10 meters. He again took a left turn after walking 20 meters. Which direction is he facing now?",
        "options": ["South", "North", "West", "East"],
        "answer": "South",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Sushil walked 15 meters towards South, took a left turn and walked 20 meters. Again he took a left turn and walked 15 meters. How far and in which direction is he from the starting point?",
        "options": ["20 meters, West", "20 meters, East", "50 meters, West", "50 meters, East"],
        "answer": "20 meters, East",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Choose the option that completes the given series:\n95, 115.5, 138, ?, 189",
        "options": ["154.5", "162.5", "164.5", "166.5"],
        "answer": "162.5",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Find the right most non-zero digit of (1230)^12346",
        "options": ["3", "9", "7", "1"],
        "answer": "9",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Arjun told Kalyan, 'Yesterday, I met the only brother of the daughter of my grandmother'. Whom did Arjun meet?",
        "options": ["Uncle", "Father", "Father-in-law", "Either a or b"],
        "answer": "Either a or b",
        "points": 1,
        "negative_marking": 0.0
    },
    {
        "type": "mcq",
        "question": "Find out from amongst the four alternatives as to how the pattern would appear when the transparent sheet is folded at the dotted line.",
        "options": ["1", "2", "3", "4"],
        "answer": "2",
        "points": 1,
        "negative_marking": 0.0,
        "image_url": "/assessment_images/q34.png"
    },
    {
        "type": "mcq",
        "question": "Find the next image in the series.",
        "options": ["1", "2", "3", "4"],
        "answer": "1",
        "points": 1,
        "negative_marking": 0.0,
        "image_url": "/assessment_images/q35.png"
    }
]

POLICY_SET_D = {
    "fullscreen_required": True,
    "single_tab": True,
    "disable_copy": True,
    "disable_paste": True,
    "disable_cut": True,
    "disable_print": True,
    "disable_right_click": True,
    "disable_selection": True,
    "disable_refresh": True,
    "disable_back_navigation": True,
    "detect_dev_tools": True,
    "detect_fullscreen_exit": True,
    "detect_tab_switch": True,
    "detect_window_blur": False,
    "detect_window_minimize": True,
    "detect_extension_removal": True,
    "max_warnings": 4,
    "grace_period_seconds": 3
}

def seed_database_if_empty(db: Session):
    """Seed initial assessments and faculty accounts if the database is newly initialized."""
    try:
        # 1. Seed Aptitude Test Set D if not present
        existing_test = db.query(DBAssessment).filter(
            DBAssessment.title.like("%Aptitude Test (Set D)%")
        ).first()

        if not existing_test:
            new_assessment = DBAssessment(
                title="Aptitude Test (Set D) - MBA-Trimester 1 (30 marks)",
                description="Official MBA-Trimester 1 Aptitude Test. 30 Minutes duration. Strict anti-cheating proctoring with 4 warnings allowed. Window blur disabled.",
                duration_minutes=30,
                passing_score=40,
                max_attempts=1,
                randomize_questions=False,
                shuffle_options=False,
                status="published",
                access_code="56M9V560",
                security_policy=POLICY_SET_D,
                questions=QUESTIONS_SET_D,
                created_by="admin",
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow()
            )
            db.add(new_assessment)
            db.commit()
            print("[Database Seed] Seeded Aptitude Test (Set D) with code 56M9V560")

        # 2. Seed default Emmanuel faculty account if not present
        emmanuel = db.query(DBInstructor).filter(
            DBInstructor.email == "emmanuel_2028@woxsen.edu.in"
        ).first()

        if not emmanuel:
            new_instructor = DBInstructor(
                name="Emmanuel",
                email="emmanuel_2028@woxsen.edu.in",
                password_hash=hash_password("1234567890"),
                role="instructor",
                is_approved=True,
                created_at=datetime.datetime.utcnow()
            )
            db.add(new_instructor)
            db.commit()
            print("[Database Seed] Seeded default approved Emmanuel faculty account")
    except Exception as e:
        db.rollback()
        print(f"[Database Seed Error]: {e}")
