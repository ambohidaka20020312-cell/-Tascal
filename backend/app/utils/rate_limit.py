import os
import time
import redis
from functools import wraps
from flask import request, jsonify, current_app


def _get_redis():
    return redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))


def rate_limit(max_requests: int, window_seconds: int, key_prefix: str = "rl"):
    """
    Sliding window rate limiter using Redis.
    key: {prefix}:{ip_or_user}
    Uses Redis sorted set — timestamps as scores, prune old entries each request.
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                r = _get_redis()
                # キー: IPアドレス or JWT user_id
                identifier = request.headers.get("X-Forwarded-For", request.remote_addr)
                key = f"{key_prefix}:{identifier}"
                now = time.time()
                window_start = now - window_seconds

                pipe = r.pipeline()
                pipe.zremrangebyscore(key, 0, window_start)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, window_seconds)
                results = pipe.execute()
                count = results[2]

                if count > max_requests:
                    retry_after = int(window_seconds - (now - window_start))
                    resp = jsonify({"error": {"code": "TOO_MANY_REQUESTS", "message": "リクエスト数が多すぎます"}})
                    resp.status_code = 429
                    resp.headers["Retry-After"] = str(retry_after)
                    resp.headers["X-RateLimit-Limit"] = str(max_requests)
                    resp.headers["X-RateLimit-Remaining"] = "0"
                    resp.headers["X-RateLimit-Reset"] = str(int(now + retry_after))
                    return resp

                remaining = max(0, max_requests - count)
                request.rate_limit_remaining = remaining
                request.rate_limit_limit = max_requests
            except redis.RedisError:
                # Redisが落ちていてもサービスは継続（フェイルオープン）
                current_app.logger.warning("Redis unavailable, rate limiting skipped")
            return f(*args, **kwargs)
        return wrapper
    return decorator


# ログイン試行専用（厳格）
login_rate_limit = rate_limit(max_requests=5, window_seconds=900, key_prefix="login")
# 一般API用
api_rate_limit = rate_limit(max_requests=100, window_seconds=60, key_prefix="api")


def is_locked(key: str) -> bool:
    """Check if a key is locked out (too many failures)."""
    try:
        r = _get_redis()
        return bool(r.get(f"lockout:{key}"))
    except Exception:
        return False


def lockout_remaining(key: str) -> int:
    """Return remaining lockout seconds, or 0 if not locked."""
    try:
        r = _get_redis()
        ttl = r.ttl(f"lockout:{key}")
        return max(ttl, 0)
    except Exception:
        return 0


def record_failure(key: str, max_failures: int = 5, lockout_seconds: int = 900) -> None:
    """Record a failed attempt; lock out after max_failures."""
    try:
        r = _get_redis()
        failure_key = f"failures:{key}"
        count = r.incr(failure_key)
        r.expire(failure_key, lockout_seconds)
        if count >= max_failures:
            r.setex(f"lockout:{key}", lockout_seconds, "1")
    except Exception:
        pass


def record_success(key: str) -> None:
    """Clear failure counter on successful auth."""
    try:
        r = _get_redis()
        r.delete(f"failures:{key}", f"lockout:{key}")
    except Exception:
        pass
