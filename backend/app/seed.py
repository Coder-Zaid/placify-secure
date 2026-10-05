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

QUESTIONS_DAA_INTERNAL_II = [
    {
        "type": "mcq",
        "question": "Q1. Red-Black Tree – Insertion and Rotations\nA Red-Black Tree is initially empty. Insert keys in order: 20, 10, 30, 5, 15, 25, 35, 1. Assume standard insertion algorithm (each newly inserted node initially RED). Determine the total number of rotations required.",
        "options": ["0 rotations (Recoloring only)", "1 rotation", "2 rotations", "3 rotations"],
        "answer": "0 rotations (Recoloring only)",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q2. Red-Black Tree – Height Bound\nA Red-Black Tree contains 255 internal nodes. Which of the following can be the maximum possible height?",
        "options": ["A. 8", "B. 12", "C. 16", "D. 20"],
        "answer": "C. 16",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q3. Greedy Method – Activity Selection\nConsider activities: A1(1,4), A2(3,5), A3(0,6), A4(5,7), A5(3,9), A6(5,9), A7(6,10), A8(8,11), A9(8,12), A10(2,14), A11(12,16). Determine the maximum number of mutually compatible activities.",
        "options": ["3", "4", "5", "6"],
        "answer": "4",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q4. Job Scheduling with Deadlines\nFive jobs with unit execution time each:\nJ1 (d=2, p=100), J2 (d=1, p=19), J3 (d=2, p=27), J4 (d=1, p=25), J5 (d=3, p=15).\nWhat is the maximum obtainable profit?",
        "options": ["127", "142", "145", "186"],
        "answer": "142",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q5. Fractional Knapsack\nA knapsack has capacity 50 kg. Items: I1 (w=10, p=60), I2 (w=20, p=100), I3 (w=30, p=120). Determine the maximum profit obtained.",
        "options": ["200", "220", "240", "280"],
        "answer": "240",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q6. Kruskal's Minimum Spanning Tree\nUndirected weighted graph edges: (A,B,1), (A,C,5), (B,C,4), (B,D,2), (C,D,3), (C,E,6), (D,E,7). Find the total cost of the MST using Kruskal's algorithm.",
        "options": ["10", "12", "15", "16"],
        "answer": "12",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q7. Prim's Algorithm\nConstruct an MST starting from vertex 1 using Prim's algorithm for the graph with edges: (1,2)=2, (1,4)=6, (2,3)=3, (2,5)=5, (2,4)=8, (3,5)=7, (4,5)=9. What is the cumulative MST cost?",
        "options": ["12", "14", "16", "18"],
        "answer": "16",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q8. Single-Source Shortest Path – Dijkstra's Algorithm\nDirected edges: S→A=10, S→B=5, B→A=3, A→C=1, B→C=9, B→D=2, D→C=6. Find the shortest distance from S to vertex C.",
        "options": ["7", "8", "9", "11"],
        "answer": "9",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q9. Huffman Coding\nSix symbols with frequencies: A:5, B:9, C:12, D:13, E:16, F:45. Determine the total number of bits needed to encode 100 symbols with these exact frequencies.",
        "options": ["210 bits", "224 bits", "236 bits", "250 bits"],
        "answer": "224 bits",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q10. 0-1 Knapsack\nKnapsack capacity W=7. Available items: I1 (w=1, p=1), I2 (w=3, p=4), I3 (w=4, p=5), I4 (w=5, p=7). Determine the maximum obtainable profit using dynamic programming.",
        "options": ["7", "8", "9", "12"],
        "answer": "9",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q11. Matrix Chain Multiplication\nMatrices have dimensions A1: 10×30, A2: 30×5, A3: 5×60, A4: 60×10. What is an optimal parenthesization minimizing scalar multiplications?",
        "options": ["(A1(A2A3))A4", "(A1A2)(A3A4)", "A1((A2A3)A4)", "((A1A2)A3)A4"],
        "answer": "(A1A2)(A3A4)",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q12. Longest Common Subsequence (LCS)\nGiven X = AGGTAB and Y = GXTXAYB, find the length and one valid LCS.",
        "options": ["Length 3: GAB", "Length 4: GTAB", "Length 4: GATB", "Length 5: AGTAB"],
        "answer": "Length 4: GTAB",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q13. Longest Increasing Subsequence (LIS)\nFind the length of the longest increasing subsequence of: 10, 22, 9, 33, 21, 50, 41, 60, 80.",
        "options": ["4", "5", "6", "7"],
        "answer": "6",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q14. All-Pairs Shortest Paths – Floyd-Warshall\nUsing Floyd-Warshall on initial distances: 1→2=3, 1→4=7, 2→1=8, 2→3=2, 3→1=5, 3→4=1, 4→1=2, find the shortest distance from vertex 2 to 1.",
        "options": ["3", "5", "7", "8"],
        "answer": "5",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q15. Travelling Salesman Problem (TSP)\nA salesman visits 4 cities starting and ending at A. Cost matrix: A-B:10, A-C:15, A-D:20, B-C:35, B-D:25, C-D:30. Find the minimum-cost Hamiltonian tour.",
        "options": ["75", "80", "85", "90"],
        "answer": "80",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q16. Graph Coloring\nLet V={1,2,3,4} and E={(1,2),(1,3),(2,3),(2,4),(3,4)}. Determine the minimum number of colors required (chromatic number χ(G)).",
        "options": ["2", "3", "4", "5"],
        "answer": "3",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q17. N-Queen Problem\nFor the 4-Queen problem, how many valid non-attacking placement solutions exist?",
        "options": ["1", "2", "4", "8"],
        "answer": "2",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q18. Sum of Subsets (Backtracking)\nGiven S={5,10,12,13,15,18}, which of the following subsets achieves sum M=30?",
        "options": ["{5, 10, 18}", "{12, 18}", "{10, 13, 15}", "{5, 12, 15}"],
        "answer": "{12, 18}",
        "points": 2,
        "negative_marking": 0.5
    },
    {
        "type": "mcq",
        "question": "Q19. Comparative Shortest-Path Algorithms\nA graph contains negative edge weights but no negative-weight cycle reachable from the source. Which algorithm must be used for single-source shortest paths?",
        "options": ["Dijkstra", "Bellman-Ford", "Warshall", "Floyd-Warshall"],
        "answer": "Bellman-Ford",
        "points": 2,
        "negative_marking": 0.5
    }
]

POLICY_DAA = {
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

        # 2. Seed DAA Internal-II Assessment if not present
        existing_daa = db.query(DBAssessment).filter(
            DBAssessment.title.like("%Internal-II%DAA%") | DBAssessment.title.like("%Practice Problems for Internal-II%")
        ).first()

        if not existing_daa:
            new_daa = DBAssessment(
                title="Practice Problems for Internal-II (DAA - GATE Style)",
                description="19 Problem-Solving Questions covering Advanced Data Structures (Red-Black Trees), Greedy Algorithms, Dynamic Programming, and Backtracking.",
                duration_minutes=45,
                passing_score=50,
                max_attempts=1,
                randomize_questions=False,
                shuffle_options=False,
                status="published",
                access_code="DAA2026X",
                security_policy=POLICY_DAA,
                questions=QUESTIONS_DAA_INTERNAL_II,
                created_by="admin",
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow()
            )
            db.add(new_daa)
            db.commit()
            print("[Database Seed] Seeded DAA Internal-II with code DAA2026X")

        # 3. Seed default Emmanuel faculty account if not present
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
