import os
import hashlib
import functools
import redis
from flask import request, current_app
from flask_jwt_extended import get_jwt_identity

DEFAULT_TTL = 300  # 5 minutes


def _get_redis():
    try:
        return redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    except Exception:
        return None


def cache_key(prefix: str, *parts) -> str:
    raw = ":".join(str(p) for p in parts)
    return f"cache:{prefix}:{hashlib.md5(raw.encode()).hexdigest()}"


def invalidate_user_cache(user_id: int):
    """Delete all cache keys for a user using a secondary index set."""
    try:
        r = _get_redis()
        if r is None:
            return
        index_key = f"cache:user_index:{user_id}"
        cached_keys = r.smembers(index_key)
        if cached_keys:
            r.delete(*cached_keys)
        r.delete(index_key)
    except Exception:
        try:
            current_app.logger.warning("Cache invalidation failed for user %s", user_id)
        except Exception:
            pass


def cached(prefix: str, ttl: int = DEFAULT_TTL, vary_by_user: bool = True):
    """Decorator for Flask view functions. Returns cached JSON if available."""
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity() if vary_by_user else "anon"
            key = cache_key(prefix, user_id, request.query_string.decode())
            r = None
            try:
                r = _get_redis()
            except Exception:
                pass

            if r:
                try:
                    cached_val = r.get(key)
                    if cached_val is not None:
                        return cached_val, 200, {
                            "Content-Type": "application/json",
                            "X-Cache": "HIT",
                        }
                except Exception:
                    r = None

            result = fn(*args, **kwargs)

            if r:
                try:
                    data = result.get_data() if hasattr(result, "get_data") else None
                    if data:
                        r.setex(key, ttl, data)
                        # Register key in user index for efficient invalidation
                        if vary_by_user and user_id != "anon":
                            index_key = f"cache:user_index:{user_id}"
                            r.sadd(index_key, key)
                            r.expire(index_key, ttl + 60)
                except Exception:
                    pass

            # Add X-Cache: MISS header on cache misses
            if hasattr(result, "headers"):
                result.headers["X-Cache"] = "MISS"

            return result
        return wrapper
    return decorator
