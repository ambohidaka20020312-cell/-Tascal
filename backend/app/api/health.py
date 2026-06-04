from datetime import datetime, timezone
from flask import Blueprint, jsonify

bp = Blueprint("health", __name__)


@bp.get("/api/v1/health")
def health_check():
    return jsonify({
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    })
