import json
import os
from datetime import date, datetime, time, timedelta

from flask import Blueprint, jsonify, redirect, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from .. import db
from ..models.task import Task
from ..models.user import User

bp = Blueprint("integrations", __name__)

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:5000/api/v1/integrations/google/callback",
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def _make_flow():
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [REDIRECT_URI],
        }
    }
    flow = Flow.from_client_config(client_config, scopes=SCOPES, redirect_uri=REDIRECT_URI)
    return flow


def _get_credentials(user: User) -> Credentials:
    creds = Credentials.from_authorized_user_info(user.google_calendar_token, SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        user.google_calendar_token = json.loads(creds.to_json())
        db.session.commit()
    return creds


def sync_task_to_google(user: User, task: Task):
    """タスク1件をGoogleカレンダーに同期"""
    if not user.google_calendar_token:
        return

    creds = _get_credentials(user)
    service = build("calendar", "v3", credentials=creds)

    # due_datetime or scheduled_date から時間を決定
    if task.due_datetime:
        start = task.due_datetime
    else:
        base_date = task.scheduled_date or date.today()
        start = datetime.combine(base_date, time(9, 0))

    end = start + timedelta(minutes=task.estimated_minutes or 30)

    event_body = {
        "summary": task.title,
        "description": task.description or "",
        "start": {"dateTime": start.isoformat(), "timeZone": "Asia/Tokyo"},
        "end": {"dateTime": end.isoformat(), "timeZone": "Asia/Tokyo"},
        "extendedProperties": {"private": {"tascal_task_id": str(task.id)}},
    }

    if task.google_event_id:
        service.events().update(
            calendarId="primary", eventId=task.google_event_id, body=event_body
        ).execute()
    else:
        event = service.events().insert(calendarId="primary", body=event_body).execute()
        task.google_event_id = event["id"]
        db.session.commit()


@bp.get("/google/auth")
@jwt_required()
def google_auth():
    user_id = get_jwt_identity()
    flow = _make_flow()
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=str(user_id),
    )
    return jsonify({"data": {"authorization_url": authorization_url}})


@bp.get("/google/callback")
def google_callback():
    code = request.args.get("code")
    state = request.args.get("state")

    if not code or not state:
        return redirect(f"{FRONTEND_URL}/settings?google_error=missing_params")

    try:
        user_id = int(state)
    except (ValueError, TypeError):
        return redirect(f"{FRONTEND_URL}/settings?google_error=invalid_state")

    user = User.query.get(user_id)
    if not user:
        return redirect(f"{FRONTEND_URL}/settings?google_error=user_not_found")

    flow = _make_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials
    user.google_calendar_token = json.loads(creds.to_json())
    user.google_calendar_sync_enabled = True
    db.session.commit()

    return redirect(f"{FRONTEND_URL}/settings?google_connected=1")


@bp.delete("/google")
@jwt_required()
def google_disconnect():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    user.google_calendar_token = None
    user.google_calendar_sync_enabled = False
    db.session.commit()
    return jsonify({"message": "Googleカレンダーの連携を解除しました"})


@bp.get("/google/status")
@jwt_required()
def google_status():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    connected = user.google_calendar_token is not None
    return jsonify(
        {
            "data": {
                "connected": connected,
                "sync_enabled": user.google_calendar_sync_enabled if connected else False,
            }
        }
    )


@bp.post("/google/sync")
@jwt_required()
def google_sync():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user.google_calendar_token:
        return jsonify({"error": {"code": "NOT_CONNECTED", "message": "Googleカレンダーが連携されていません"}}), 400

    today = date.today()
    until = today + timedelta(days=7)

    tasks = Task.query.filter(
        Task.user_id == user_id,
        Task.is_deleted == False,
        Task.status.notin_(["completed", "done"]),
        db.or_(
            db.and_(Task.scheduled_date >= today, Task.scheduled_date <= until),
            db.and_(Task.due_datetime >= datetime.combine(today, time.min),
                    Task.due_datetime <= datetime.combine(until, time.max)),
        ),
    ).all()

    synced = 0
    errors = 0
    for task in tasks:
        try:
            sync_task_to_google(user, task)
            synced += 1
        except Exception:
            errors += 1

    return jsonify(
        {
            "data": {"synced": synced, "errors": errors},
            "message": f"{synced}件のタスクをGoogleカレンダーに同期しました",
        }
    )
