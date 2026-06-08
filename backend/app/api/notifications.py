"""Notifications blueprint — VAPID public key endpoint and send_push helper.

The send_push() helper can be imported by any other module that needs to deliver
a Web Push notification synchronously (e.g. channels.py).  For background
delivery (Celery), prefer tasks.push_notifications.send_push_to_user.
"""
import json
import logging
import os

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

logger = logging.getLogger(__name__)

notifications_bp = Blueprint("notifications", __name__)

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS = {
    "sub": "mailto:" + os.getenv("VAPID_CLAIMS_EMAIL", os.getenv("MAIL_USERNAME", "info@tascal.app"))
}


# ---------------------------------------------------------------------------
# Public endpoint — no auth required (browser needs this before subscribing)
# ---------------------------------------------------------------------------

@notifications_bp.get("/vapid-public-key")
def get_vapid_public_key():
    """Return the VAPID public key so the browser can subscribe to push."""
    return jsonify({"data": {"public_key": VAPID_PUBLIC_KEY}})


# ---------------------------------------------------------------------------
# Subscribe / unsubscribe — thin wrappers that delegate to the push blueprint
# The canonical implementation lives in push.py; these routes exist for
# clients that use the /notifications prefix.
# ---------------------------------------------------------------------------

@notifications_bp.post("/subscribe")
@jwt_required()
def subscribe():
    from .push import subscribe as _push_subscribe
    return _push_subscribe()


@notifications_bp.delete("/unsubscribe")
@jwt_required()
def unsubscribe():
    from .push import unsubscribe as _push_unsubscribe
    return _push_unsubscribe()


# ---------------------------------------------------------------------------
# Helper — synchronous push (used by channels.py etc.)
# ---------------------------------------------------------------------------

def send_push(user, title: str, body: str, url: str = "/") -> None:
    """Send a Web Push notification to every subscription of *user*.

    Silently removes expired (HTTP 410) subscriptions.
    No-op when VAPID keys are not configured.
    """
    if not VAPID_PRIVATE_KEY:
        return

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.warning("pywebpush is not installed; skipping push notification")
        return

    from ..models.push_subscription import PushSubscription
    from .. import db

    subscriptions = PushSubscription.query.filter_by(user_id=user.id).all()
    payload = json.dumps({"title": title, "body": body, "url": url})

    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS,
            )
        except WebPushException as exc:
            response = getattr(exc, "response", None)
            if response is not None and response.status_code == 410:
                try:
                    db.session.delete(sub)
                    db.session.commit()
                except Exception:
                    db.session.rollback()
            else:
                logger.warning("Push send failed for sub %s (user %s): %s", sub.id, user.id, exc)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Unexpected push error for sub %s: %s", sub.id, exc)
