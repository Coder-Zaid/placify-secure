import asyncio
import time
import sys
import os
from pathlib import Path

# Add app to path
app_dir = Path(__file__).resolve().parent / "app"
sys.path.insert(0, str(app_dir))

import httpx
from main import app, lifespan

async def run_stress_test():
    print("=" * 65)
    print("PLACIFY SECURE -- CONCURRENCY & STRESS TEST (200 CONCURRENT USERS)")
    print("=" * 65)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Startup lifespan
        async with lifespan(app):
            # Health check
            resp = await client.get("/health")
            print(f"Health check: {resp.status_code} -> {resp.json()}")
            assert resp.status_code == 200, "Health check failed"

            # Create test assessment
            create_payload = {
                "title": "High Concurrency Stress Exam 2026",
                "description": "5K-6K concurrent taker validation test",
                "created_by": "prof.stress@woxsen.edu.in",
                "duration_minutes": 60,
                "passing_score": 50,
                "max_attempts": 1,
                "questions": [
                    {
                        "type": "mcq",
                        "question": f"Question #{i}: What is the time complexity of operation {i}?",
                        "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
                        "answer": "O(1)",
                        "points": 1
                    }
                    for i in range(10)
                ]
            }
            create_resp = await client.post("/assessment/create", json=create_payload)
            assert create_resp.status_code == 200, f"Failed to create assessment: {create_resp.text}"
            assessment_id = create_resp.json()["id"]
            print(f"Created Test Assessment ID: {assessment_id}")

            # 2. Concurrently start 200 students
            NUM_STUDENTS = 200
            print(f"\n[Phase 1] Simulating {NUM_STUDENTS} students starting simultaneously...")
            
            start_latencies = []
            start_begin = time.perf_counter()

            async def start_student(i):
                t0 = time.perf_counter()
                r = await client.post(
                    f"/assessment/{assessment_id}/start",
                    json={
                        "student_name": f"Student {i:03d}",
                        "student_email": f"student{i:03d}@woxsen.edu.in",
                        "roll_number": f"WOX-{i:04d}"
                    }
                )
                dt = (time.perf_counter() - t0) * 1000
                start_latencies.append(dt)
                return r

            start_results = await asyncio.gather(*(start_student(i) for i in range(NUM_STUDENTS)))
            start_total_time = time.perf_counter() - start_begin

            successful_starts = [r for r in start_results if r.status_code == 200]
            print(f"  [OK] {len(successful_starts)}/{NUM_STUDENTS} starts succeeded in {start_total_time:.2f}s ({len(successful_starts)/start_total_time:.1f} req/s)")
            start_latencies.sort()
            p50 = start_latencies[len(start_latencies)//2]
            p95 = start_latencies[int(len(start_latencies)*0.95)]
            print(f"  [OK] Latency: P50 = {p50:.1f}ms | P95 = {p95:.1f}ms")
            assert len(successful_starts) == NUM_STUDENTS, f"Failed starts: {NUM_STUDENTS - len(successful_starts)}"

            attempt_ids = [r.json()["attempt_id"] for r in successful_starts]

            # 3. Simulate high-frequency live answer syncing
            # 200 students x 5 sync operations each = 1,000 sync requests
            print(f"\n[Phase 2] Simulating 1,000 concurrent answer sync operations...")
            sync_latencies = []
            sync_begin = time.perf_counter()

            async def sync_attempt(attempt_id, q_idx):
                t0 = time.perf_counter()
                r = await client.post(
                    f"/assessment/{assessment_id}/sync",
                    json={
                        "attempt_id": attempt_id,
                        "responses": {str(q_idx): "O(1)"}
                    }
                )
                dt = (time.perf_counter() - t0) * 1000
                sync_latencies.append(dt)
                return r

            sync_tasks = []
            for q_idx in range(5):
                for att_id in attempt_ids:
                    sync_tasks.append(sync_attempt(att_id, q_idx))

            sync_results = await asyncio.gather(*sync_tasks)
            sync_total_time = time.perf_counter() - sync_begin
            successful_syncs = [r for r in sync_results if r.status_code == 200]

            sync_latencies.sort()
            s_p50 = sync_latencies[len(sync_latencies)//2]
            s_p95 = sync_latencies[int(len(sync_latencies)*0.95)]
            print(f"  [OK] {len(successful_syncs)}/1000 syncs succeeded in {sync_total_time:.2f}s ({len(successful_syncs)/sync_total_time:.1f} req/s)")
            print(f"  [OK] Latency: P50 = {s_p50:.1f}ms | P95 = {s_p95:.1f}ms")
            assert len(successful_syncs) == 1000, "Some sync calls failed"

            # 4. Check Analytics & Monitor during active test
            print("\n[Phase 3] Polling Analytics & Monitor while students are in-progress...")
            t0 = time.perf_counter()
            analytics_resp = await client.get(f"/assessment/{assessment_id}/analytics")
            dt_analytics = (time.perf_counter() - t0) * 1000
            assert analytics_resp.status_code == 200
            adata = analytics_resp.json()
            print(f"  [OK] Analytics response in {dt_analytics:.1f}ms: total_attempts={adata['total_attempts']}, in_progress={adata['in_progress']}")

            t0 = time.perf_counter()
            monitor_resp = await client.get(f"/assessment/{assessment_id}/monitor")
            dt_monitor = (time.perf_counter() - t0) * 1000
            assert monitor_resp.status_code == 200
            mdata = monitor_resp.json()
            print(f"  [OK] Monitor response in {dt_monitor:.1f}ms: returned {len(mdata['students'])} candidates with live cache answers")

            # 5. Concurrently submit 200 exams
            print(f"\n[Phase 4] Concurrently submitting 200 exams with auto-grading...")
            submit_latencies = []
            submit_begin = time.perf_counter()

            async def submit_student(att_id):
                t0 = time.perf_counter()
                r = await client.post(
                    f"/assessment/{assessment_id}/submit",
                    json={
                        "attempt_id": att_id,
                        "responses": {str(i): "O(1)" for i in range(10)}
                    }
                )
                dt = (time.perf_counter() - t0) * 1000
                submit_latencies.append(dt)
                return r

            submit_results = await asyncio.gather(*(submit_student(att_id) for att_id in attempt_ids))
            submit_total_time = time.perf_counter() - submit_begin
            successful_submits = [r for r in submit_results if r.status_code == 200]

            submit_latencies.sort()
            sub_p50 = submit_latencies[len(submit_latencies)//2]
            sub_p95 = submit_latencies[int(len(submit_latencies)*0.95)]
            print(f"  [OK] {len(successful_submits)}/{NUM_STUDENTS} submissions succeeded in {submit_total_time:.2f}s ({len(successful_submits)/submit_total_time:.1f} req/s)")
            print(f"  [OK] Latency: P50 = {sub_p50:.1f}ms | P95 = {sub_p95:.1f}ms")
            assert len(successful_submits) == NUM_STUDENTS, "Some submissions failed"

            # 6. Final verification
            final_analytics = await client.get(f"/assessment/{assessment_id}/analytics")
            fa_data = final_analytics.json()
            print(f"\n[Phase 5] Final Analytics: completed={fa_data['completed']}, pass_rate={fa_data['pass_rate']}%, avg_score={fa_data['average_score']}%")
            assert fa_data['completed'] == NUM_STUDENTS
            assert fa_data['in_progress'] == 0

    print("\n" + "=" * 65)
    print("ALL STRESS TESTS PASSED WITH ZERO ERRORS!")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(run_stress_test())
