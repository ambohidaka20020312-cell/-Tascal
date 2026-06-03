"""Celery tasks for sending Web Push notifications."""
import json
import logging

from ..celery_app import celery

logger = logging.getLogger(__name__)


@celery.task(bind=True, max_retries=3)
def send_push_to_user(self, user_id: int, title: str, body: str, url: str = "/"):
    """Send a Web Push notification to all subscriptions belonging to *user_id*.

    Expired subscriptions (HTTP 410 from the push service) are deleted
    automatically.  Individual subscription errors are handled silently so that
    one bad subscription does not prevent delivery to the rest.
    """
    from pywebpush import webpush, WebPushException
    from flask import current_app

    from ..models.push_subscription import PushSubscription
    from .. import db

    subscriptions = PushSubscription.query.filter_by(user_id=user_id).all()
    if not subscriptions:
        return {"sent": 0, "deleted": 0}

    vapid_private_key = current_app.config.get("VAPID_PRIVATE_KEY", "")
    vapid_claims = {
        "sub": "mailto:{}".format(
            current_app.config.get("VAPID_CLAIMS_EMAIL", "admin@tascal.app")
        )
    }

    payload = json.dumps({"title": title, "body": body, "url": url})

    sent = 0
    deleted = 0

    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth,
                    },
                },
                data=payload,
                vapid_private_key=vapid_private_key,
                vapid_claims=vapid_claims,
            )
            sent += 1
        except WebPushException as exc:
            response = exc.response
            if response is not None and response.status_code == 410:
                # Subscription has expired — remove it
                try:
                    db.session.delete(sub)
                    db.session.commit()
                    deleted += 1
                except Exception:
                    db.session.rollback()
            else:
                logger.warning(
                    "Failed to send push to subscription %s for user %s: %s",
                    sub.id,
                    user_id,
                    exc,
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Unexpected error sending push to subscription %s: %s", sub.id, exc
            )

    logger.info(
        "send_push_to_user user=%s sent=%s deleted=%s", user_id, sent, deleted
    )
    return {"sent": sent, "deleted": deleted}
