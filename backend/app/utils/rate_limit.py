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
