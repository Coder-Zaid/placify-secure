import urllib.request
import json

questions = [
    {
        "type": "mcq",
        "question": "What is the unit digit in (4137!)^74342?",
        "options": ["7", "9", "3", "0"],
        "answer": "0",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "If 90% of A = 50% of B and B = x% of A, then the value of x is:",
        "options": ["140", "160", "170", "180"],
        "answer": "180",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Nikhil’s salary was decreased by 10% and subsequently increased by 10%, How much percent does he lose?",
        "options": ["0%", "1%", "2%", "4%"],
        "answer": "1%",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Find the ratio of CP and SP, if loss % is 20%?",
        "options": ["10:7", "7:10", "5:4", "9:5"],
        "answer": "5:4",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Aman and Bhanu can do a piece of work in 50 days. With the help of Chandhu, they can finish it in 30 days. How long will Chandhu take to finish it alone?",
        "options": ["50", "75", "150", "200"],
        "answer": "75",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": 'If the word "CODING" is represented as "DPEJOH", then the word "CURFEW" will be represented as:',
        "options": ["DVSGFX", "DVSHFX", "DGSHFX", "DTSGFY"],
        "answer": "DVSGFX",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Choose the option that completes the given series:\n95, 115.5, 138, ?, 189.",
        "options": ["154.5", "162.5", "164.5", "166.5"],
        "answer": "162.5",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Ram told Lakshman, 'Yesterday, I met the only brother of the daughter of my grandmother.' Whom did Ram meet?",
        "options": ["Uncle", "Father", "Father-in-law", "Either a or b"],
        "answer": "Either a or b",
        "points": 2,
        "negative_marking": 0.5
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
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Identify the error(s) in the following sentences, if any:\nOne of the students (A) / must give (B) / their oral report (C) / tomorrow. (D)",
        "options": ["A", "B", "C", "D"],
        "answer": "C",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Choose the meaning of the idiom:\nMithun will do anything he can to squirrel out of going to school.",
        "options": ["manage to escape.", "manage to enter.", "to save money to do an act.", "to jump out."],
        "answer": "manage to escape.",
        "points": 2,
        "negative_marking": 0.5
    }
]

payload = {
    "title": "Aptitude, Reasoning & Verbal Assessment",
    "description": "Comprehensive 11-question assessment covering quantitative aptitude, series, syllogism & relations, data sufficiency, and verbal English.",
    "duration_minutes": 30,
    "passing_score": 50,
    "max_attempts": 1,
    "randomize_questions": False,
    "shuffle_options": False,
    "questions": questions,
    "security_policy": {
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
        "detect_window_blur": True,
        "detect_window_minimize": True,
        "detect_extension_removal": True,
        "max_warnings": 2,
        "grace_period_seconds": 2
    }
}

api_url = "https://placify-secure-api.onrender.com"

print("Sending creation request to Render API...")
req = urllib.request.Request(
    f"{api_url}/assessment/create",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode("utf-8"))
    print("Assessment Created Successfully:", res)
    assessment_id = res["assessment_id"]

print(f"Publishing Assessment ID {assessment_id}...")
pub_req = urllib.request.Request(
    f"{api_url}/assessment/publish/{assessment_id}",
    data=b"{}",
    headers={"Content-Type": "application/json"}
)

with urllib.request.urlopen(pub_req) as pub_resp:
    pub_res = json.loads(pub_resp.read().decode("utf-8"))
    print("Assessment Published Successfully!")
    print(f"Access Code: {pub_res.get('access_code')}")
