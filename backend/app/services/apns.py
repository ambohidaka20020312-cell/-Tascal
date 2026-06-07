import os
import time
import jwt as pyjwt
import httpx
from ..models.device_token import DeviceToken
from .. import db

APNS_KEY_ID = os.getenv("APNS_KEY_ID")          # Apple Developer で発行
APNS_TEAM_ID = os.getenv("APNS_TEAM_ID")        # Apple Developer Team ID
APNS_BUNDLE_ID = os.getenv("APNS_BUNDLE_ID", "app.tascal.ios")
APNS_KEY_PATH = os.getenv("APNS_KEY_PATH")      # .p8ファイルのパス
APNS_KEY_CONTENT = os.getenv("APNS_KEY_CONTENT")  # .p8の内容を直接env varに（本番用）
APNS_USE_SANDBOX = os.getenv("APNS_USE_SANDBOX", "true").lower() == "true"


def _get_apns_token() -> str:
    """JWTトークンを生成（10分有効）"""
    key_content = APNS_KEY_CONTENT
    if not key_content and APNS_KEY_PATH:
        with open(APNS_KEY_PATH, "r") as f:
            key_content = f.read()

    if not key_content or not APNS_KEY_ID or not APNS_TEAM_ID:
        raise ValueError("APNs credentials not configured")

    token = pyjwt.encode(
        {"iss": APNS_TEAM_ID, "iat": int(time.time())},
        key_content,
        algorithm="ES256",
        headers={"alg": "ES256", "kid": APNS_KEY_ID},
    )
    return token


def send_push(user_id: int, title: str, body: str, data: dict = None, badge: int = None):
    """ユーザーの全デバイスにAPNsプッシュ通知を送信"""
    tokens = DeviceToken.query.filter_by(user_id=user_id, is_active=True).all()
    if not tokens:
        return

    host = "api.sandbox.push.apple.com" if APNS_USE_SANDBOX else "api.push.apple.com"

    try:
        apns_token = _get_apns_token()
    except ValueError:
        return  # APNs未設定の場合はスキップ

    payload = {
        "aps": {
            "alert": {"title": title, "body": body},
            "sound": "default",
        }
    }
    if badge is not None:
        payload["aps"]["badge"] = badge
    if data:
        payload.update(data)

    headers = {
        "authorization": f"bearer {apns_token}",
        "apns-topic": APNS_BUNDLE_ID,
        "apns-push-type": "alert",
        "apns-priority": "10",
    }

    with httpx.Client(http2=True) as client:
        for device in tokens:
            try:
                resp = client.post(
                    f"https://{host}/3/device/{device.token}",
                    json=payload,
                    headers=headers,
                )
                if resp.status_code == 410:  # Gone - トークン無効
                    device.is_active = False
                    db.session.commit()
            except Exception:
                pass


def send_deadline_reminder(user_id: int, task_title: str, minutes_left: int):
    send_push(
        user_id,
        title="⏰ 締め切りが近づいています",
        body=f"「{task_title}」の締め切りまであと{minutes_left}分です",
        data={"type": "deadline_reminder"},
    )


def send_ai_replan_notification(user_id: int, affected_count: int):
    send_push(
        user_id,
        title="📋 AIがスケジュールを更新しました",
        body=f"{affected_count}件のタスクを再スケジュールしました",
        data={"type": "ai_replan"},
    )


def send_task_reminder(user_id: int, task_title: str):
    send_push(
        user_id,
        title="✅ タスクの確認",
        body=f"「{task_title}」はまだ未着手です",
        data={"type": "task_reminder"},
    )


def send_chat_notification(user_id: int, sender_name: str, message: str, channel_id: int):
    send_push(
        user_id,
        title=f"💬 {sender_name}",
        body=message[:100],
        data={"type": "chat", "channel_id": channel_id},
    )
