"""
Simple in-memory rate limiter for login attempt protection.
Tracks failed login attempts per IP and locks out after threshold.
"""
import time
from threading import Lock

_lock = Lock()

# {ip: {"count": int, "locked_until": float, "first_attempt": float}}
_attempts: dict = {}

MAX_ATTEMPTS = 5
LOCKOUT_SECONDS = 15 * 60  # 15 minutes
WINDOW_SECONDS = 15 * 60   # sliding window


def is_locked(ip: str) -> bool:
    """Return True if the IP is currently locked out."""
    with _lock:
        record = _attempts.get(ip)
        if not record:
            return False
        if record.get("locked_until") and time.time() < record["locked_until"]:
            return True
        # Lock expired — clean up
        if record.get("locked_until") and time.time() >= record["locked_until"]:
            del _attempts[ip]
        return False


def record_failure(ip: str) -> None:
    """Record a failed login attempt for the given IP."""
    with _lock:
        now = time.time()
        record = _attempts.get(ip)

        if record is None:
            _attempts[ip] = {"count": 1, "first_attempt": now, "locked_until": None}
            return

        # Reset if the window has expired
        if now - record["first_attempt"] > WINDOW_SECONDS:
            _attempts[ip] = {"count": 1, "first_attempt": now, "locked_until": None}
            return

        record["count"] += 1
        if record["count"] >= MAX_ATTEMPTS:
            record["locked_until"] = now + LOCKOUT_SECONDS


def record_success(ip: str) -> None:
    """Clear failed attempt records for the given IP on successful login."""
    with _lock:
        _attempts.pop(ip, None)


def lockout_remaining(ip: str) -> int:
    """Return seconds remaining in lockout, or 0 if not locked."""
    with _lock:
        record = _attempts.get(ip)
        if not record or not record.get("locked_until"):
            return 0
        remaining = int(record["locked_until"] - time.time())
        return max(0, remaining)
