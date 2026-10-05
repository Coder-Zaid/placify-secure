import requests
import json

BASE_URL = "http://127.0.0.1:8001"

def run_tests():
    print("--- 1. Testing Multi-Tenancy Isolation ---")
    
    # 1. Create Assessment by Sharma
    req_sharma = {
        "title": "Quantum Computing Exam",
        "description": "Prof Sharma Test",
        "duration_minutes": 45,
        "passing_score": 60,
        "created_by": "prof.sharma@woxsen.edu.in",
        "questions": [
            {
                "question": "What is superposition?",
                "type": "short_answer",
                "points": 5
            }
        ]
    }
    r1 = requests.post(f"{BASE_URL}/assessment/create", json=req_sharma)
    assert r1.status_code == 200, f"Failed to create sharma test: {r1.text}"
    sharma_test = r1.json()
    print(f"Created Sharma Test: ID {sharma_test['id']}")

    # Publish Sharma Test
    pub1 = requests.post(f"{BASE_URL}/assessment/publish/{sharma_test['id']}")
    assert pub1.status_code == 200, f"Failed to publish sharma test: {pub1.text}"
    sharma_access_code = pub1.json()['access_code']
    print(f"Published Sharma Test, Access Code: {sharma_access_code}")

    # 2. Create Assessment by Patel
    req_patel = {
        "title": "Distributed Systems Exam",
        "description": "Prof Patel Test",
        "duration_minutes": 60,
        "passing_score": 50,
        "created_by": "prof.patel@woxsen.edu.in",
        "questions": [
            {
                "question": "Explain Paxos consensus.",
                "type": "short_answer",
                "points": 10
            }
        ]
    }
    r2 = requests.post(f"{BASE_URL}/assessment/create", json=req_patel)
    assert r2.status_code == 200, f"Failed to create patel test: {r2.text}"
    patel_test = r2.json()
    print(f"Created Patel Test: ID {patel_test['id']}")

    # 3. List as Sharma (Faculty role)
    list_sharma = requests.get(f"{BASE_URL}/assessment/list", params={"created_by": "prof.sharma@woxsen.edu.in", "role": "faculty"}).json()
    sharma_ids = [a['id'] for a in list_sharma['assessments']]
    assert sharma_test['id'] in sharma_ids, "Sharma should see their own test"
    assert patel_test['id'] not in sharma_ids, "Sharma should NOT see Patel's test"
    print("Multi-tenancy check (Sharma view): PASSED (Only sees Sharma's test)")

    # 4. List as Patel (Faculty role)
    list_patel = requests.get(f"{BASE_URL}/assessment/list", params={"created_by": "prof.patel@woxsen.edu.in", "role": "faculty"}).json()
    patel_ids = [a['id'] for a in list_patel['assessments']]
    assert patel_test['id'] in patel_ids, "Patel should see their own test"
    assert sharma_test['id'] not in patel_ids, "Patel should NOT see Sharma's test"
    print("Multi-tenancy check (Patel view): PASSED (Only sees Patel's test)")

    # 5. List as Admin
    list_admin = requests.get(f"{BASE_URL}/assessment/list", params={"role": "admin"}).json()
    admin_ids = [a['id'] for a in list_admin['assessments']]
    assert sharma_test['id'] in admin_ids and patel_test['id'] in admin_ids, "Admin should see both tests"
    print("Multi-tenancy check (Admin view): PASSED (Admin sees all faculty tests)")

    print("\n--- 2. Testing In-Browser Phone Detection Warning & Snapshot Storage ---")
    
    # Register candidate attempt
    start_req = {
        "student_name": "Test Student",
        "student_email": "student@woxsen.edu.in",
        "roll_number": "WOX-2026-99"
    }
    r_start = requests.post(f"{BASE_URL}/assessment/{sharma_test['id']}/start", json=start_req)
    assert r_start.status_code == 200, f"Failed to start attempt: {r_start.text}"
    attempt = r_start.json()
    attempt_id = attempt['attempt_id']
    print(f"Candidate Attempt Started: {attempt_id}")

    # Send phone_detected event with mock webcam snapshot data
    fake_snapshot = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
    violation_payload = {
        "attempt_id": attempt_id,
        "event_type": "phone_detected",
        "duration_seconds": 0.0,
        "browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        "os": "Win32",
        "fullscreen_status": True,
        "snapshot_data": fake_snapshot
    }
    r_violation = requests.post(f"{BASE_URL}/assessment/{sharma_test['id']}/violations", json=violation_payload)
    assert r_violation.status_code == 200, f"Failed to log violation: {r_violation.text}"
    v_data = r_violation.json()
    print(f"Phone violation response: {v_data}")
    assert v_data['action'] == "warn", f"Phone detection should be action: warn, got {v_data['action']}"
    print("Phone detection warning check: PASSED (Candidate not terminated, action is 'warn')")

    # Fetch violations for the assessment
    r_get_violations = requests.get(f"{BASE_URL}/assessment/{sharma_test['id']}/violations")
    assert r_get_violations.status_code == 200, f"Failed to get violations: {r_get_violations.text}"
    all_violations = r_get_violations.json()['violations']
    phone_v = [v for v in all_violations if v['event_type'] == 'phone_detected']
    assert len(phone_v) > 0, "phone_detected violation should be present"
    assert phone_v[0]['snapshot_data'] == fake_snapshot, "Snapshot data must be stored and returned for instructor inspection"
    print("Snapshot retrieval check: PASSED (Webcam evidence snapshot stored & retrievable by instructor)")

    print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
