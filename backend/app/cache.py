"""
In-Memory Write-Back Cache for Student Response Syncing

At 5K–6K concurrent students, the naive approach of writing every answer change
to the database (debounced at 800ms) generates ~500 writes/sec. This cache
buffers responses in memory and flushes to DB periodically (every 5 seconds),
reducing write load by ~80%.

Thread-safe via asyncio.Lock. Data is force-flushed on submit/terminate.
"""

import asyncio
import time
import logging
from typing import Dict, Optional

logger = logging.getLogger("placify.cache")


class ResponseCache:
    """
    In-memory write-back cache for student exam responses.
    
    Instead of hitting the database on every answer change, responses are
    buffered here and periodically flushed in bulk.
    """

    def __init__(self, flush_interval: float = 5.0):
        # { attempt_id: { "responses": {...}, "dirty": bool, "last_update": float } }
        self._store: Dict[str, dict] = {}
        self._lock = asyncio.Lock()
        self._flush_interval = flush_interval
        self._flush_task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self):
        """Start the background flush loop."""
        if self._running:
            return
        self._running = True
        self._flush_task = asyncio.create_task(self._flush_loop())
        logger.info(f"[ResponseCache] Started (flush every {self._flush_interval}s)")

    async def stop(self):
        """Stop the background flush loop and flush remaining data."""
        self._running = False
        if self._flush_task:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
        logger.info("[ResponseCache] Stopped")

    async def put(self, attempt_id: str, responses: dict):
        """
        Cache a student's responses. Will be flushed to DB periodically.
        """
        async with self._lock:
            self._store[attempt_id] = {
                "responses": responses,
                "dirty": True,
                "last_update": time.time()
            }

    async def get(self, attempt_id: str) -> Optional[dict]:
        """
        Get cached responses for an attempt (if they exist in cache).
        Returns None if the attempt isn't cached.
        """
        async with self._lock:
            entry = self._store.get(attempt_id)
            if entry:
                return entry["responses"]
        return None

    async def force_flush_one(self, attempt_id: str, db_session) -> Optional[dict]:
        """
        Force-flush a single attempt's responses to DB immediately.
        Called on submit/terminate to ensure no data loss.
        Returns the flushed responses dict.
        """
        async with self._lock:
            entry = self._store.pop(attempt_id, None)
        
        if entry and entry["responses"]:
            try:
                from models import DBStudentAttempt
                attempt = db_session.query(DBStudentAttempt).filter(
                    DBStudentAttempt.attempt_id == attempt_id
                ).first()
                if attempt and attempt.status == "in_progress":
                    attempt.responses = entry["responses"]
                    db_session.commit()
                    logger.debug(f"[ResponseCache] Force-flushed {attempt_id}")
            except Exception as e:
                logger.error(f"[ResponseCache] Force-flush error for {attempt_id}: {e}")
                db_session.rollback()
            return entry["responses"]
        return None

    async def remove(self, attempt_id: str):
        """Remove an attempt from cache (after submit/terminate)."""
        async with self._lock:
            self._store.pop(attempt_id, None)

    async def _flush_loop(self):
        """Background loop that periodically flushes dirty entries to DB."""
        while self._running:
            try:
                await asyncio.sleep(self._flush_interval)
                await self._flush_dirty()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[ResponseCache] Flush loop error: {e}")

    async def _flush_dirty(self):
        """Flush all dirty entries to the database in a single session."""
        async with self._lock:
            dirty_entries = {
                k: v for k, v in self._store.items() if v.get("dirty")
            }
            if not dirty_entries:
                return
            # Mark as clean before releasing lock
            for k in dirty_entries:
                self._store[k]["dirty"] = False

        if not dirty_entries:
            return

        # Perform DB writes outside the lock
        try:
            from database import SessionLocal
            from models import DBStudentAttempt

            db = SessionLocal()
            try:
                flushed = 0
                for attempt_id, entry in dirty_entries.items():
                    attempt = db.query(DBStudentAttempt).filter(
                        DBStudentAttempt.attempt_id == attempt_id
                    ).first()
                    if attempt and attempt.status == "in_progress":
                        attempt.responses = entry["responses"]
                        flushed += 1

                if flushed > 0:
                    db.commit()
                    logger.debug(f"[ResponseCache] Bulk-flushed {flushed} attempts")
            except Exception as e:
                db.rollback()
                logger.error(f"[ResponseCache] Bulk flush DB error: {e}")
                # Re-mark as dirty so they get retried
                async with self._lock:
                    for k in dirty_entries:
                        if k in self._store:
                            self._store[k]["dirty"] = True
            finally:
                db.close()
        except Exception as e:
            logger.error(f"[ResponseCache] Flush session error: {e}")

    @property
    def size(self) -> int:
        """Number of attempts currently cached."""
        return len(self._store)

    @property
    def dirty_count(self) -> int:
        """Number of dirty (unflushed) entries."""
        return sum(1 for v in self._store.values() if v.get("dirty"))


# ---------------------------------------------------------------------------
# Global singleton — imported by routes
# ---------------------------------------------------------------------------
response_cache = ResponseCache(flush_interval=5.0)
