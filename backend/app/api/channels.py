from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User
from ..models.team import TeamMember
from ..models.channel import Channel, ChannelMember, Message
from ..models.task import Task
from .. import db
from ..utils.team_auth import require_team_seat, get_user_team
import datetime

bp = Blueprint("channels", __name__)


def _get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(user_id)


def _assert_channel_access(user, channel):
    """Return 403 if the user has no seat in the channel's team, or 403 if not a channel member."""
    err = require_team_seat(user, channel.team_id)
    if err:
        return err
    cm = ChannelMember.query.filter_by(channel_id=channel.id, user_id=user.id).first()
    if not cm:
        return jsonify({"error": {"code": "NOT_CHANNEL_MEMBER", "message": "このチャンネルのメンバーではありません"}}), 403
    return None


@bp.get("")
@jwt_required()
def list_channels():
    user = _get_current_user()
    team = get_user_team(user)
    if not team:
        return jsonify({"error": {"code": "TEAM_SEAT_REQUIRED", "message": "チームに所属していません"}}), 403

    memberships = ChannelMember.query.filter_by(user_id=user.id).all()
    channel_ids = [m.channel_id for m in memberships]
    channels = Channel.query.filter(
        Channel.id.in_(channel_ids),
        Channel.team_id == team.id,
    ).all()
    return jsonify({"data": [c.to_dict() for c in channels]})


@bp.post("")
@jwt_required()
def create_channel():
    user = _get_current_user()
    team = get_user_team(user)
    if not team:
        return jsonify({"error": {"code": "TEAM_SEAT_REQUIRED", "message": "チームに所属していません"}}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "チャンネル名は必須です"}}), 400

    channel = Channel(
        team_id=team.id,
        department_id=data.get("department_id"),
        name=name,
        channel_type="group",
        created_by=user.id,
    )
    db.session.add(channel)
    db.session.flush()

    cm = ChannelMember(channel_id=channel.id, user_id=user.id)
    db.session.add(cm)
    db.session.commit()
    return jsonify({"data": channel.to_dict(), "message": "チャンネルを作成しました"}), 201


@bp.post("/dm")
@jwt_required()
def create_dm():
    user = _get_current_user()
    team = get_user_team(user)
    if not team:
        return jsonify({"error": {"code": "TEAM_SEAT_REQUIRED", "message": "チームに所属していません"}}), 403

    data = request.get_json() or {}
    target_user_id = data.get("user_id")
    if not target_user_id:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "user_id は必須です"}}), 400

    # Ensure both users are in the same team
    target_member = TeamMember.query.filter_by(team_id=team.id, user_id=target_user_id).first()
    if not target_member:
        return jsonify({"error": {"code": "NOT_TEAM_MEMBER", "message": "相手はこのチームのメンバーではありません"}}), 400

    target_user = User.query.get_or_404(target_user_id)

    # Check if DM channel already exists
    my_channels = {cm.channel_id for cm in ChannelMember.query.filter_by(user_id=user.id).all()}
    their_channels = {cm.channel_id for cm in ChannelMember.query.filter_by(user_id=target_user_id).all()}
    common = my_channels & their_channels
    if common:
        existing_dm = Channel.query.filter(
            Channel.id.in_(common),
            Channel.channel_type == "dm",
            Channel.team_id == team.id,
        ).first()
        if existing_dm:
            return jsonify({"data": existing_dm.to_dict(), "message": "既存のDMチャンネルです"}), 200

    name = f"dm_{min(user.id, target_user_id)}_{max(user.id, target_user_id)}"
    channel = Channel(
        team_id=team.id,
        name=name,
        channel_type="dm",
        created_by=user.id,
    )
    db.session.add(channel)
    db.session.flush()

    db.session.add(ChannelMember(channel_id=channel.id, user_id=user.id))
    db.session.add(ChannelMember(channel_id=channel.id, user_id=target_user_id))
    db.session.commit()
    return jsonify({"data": channel.to_dict(), "message": "DMチャンネルを作成しました"}), 201


@bp.get("/<int:channel_id>/messages")
@jwt_required()
def list_messages(channel_id):
    user = _get_current_user()
    channel = Channel.query.get_or_404(channel_id)
    err = _assert_channel_access(user, channel)
    if err:
        return err

    limit = min(int(request.args.get("limit", 50)), 200)
    offset = int(request.args.get("offset", 0))

    messages = (
        Message.query.filter_by(channel_id=channel_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    total = Message.query.filter_by(channel_id=channel_id).count()
    return jsonify({"data": [m.to_dict() for m in reversed(messages)], "total": total})


@bp.post("/<int:channel_id>/messages")
@jwt_required()
def send_message(channel_id):
    user = _get_current_user()
    channel = Channel.query.get_or_404(channel_id)
    err = _assert_channel_access(user, channel)
    if err:
        return err

    data = request.get_json() or {}
    body = (data.get("body") or "").strip()
    if not body:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "メッセージ本文は必須です"}}), 400

    msg = Message(channel_id=channel_id, sender_id=user.id, body=body)
    db.session.add(msg)
    db.session.commit()

    # Emit via SocketIO if available
    try:
        from .. import socketio
        socketio.emit(
            "new_message",
            msg.to_dict(),
            room=f"channel_{channel_id}",
        )
    except Exception:
        pass

    return jsonify({"data": msg.to_dict(), "message": "メッセージを送信しました"}), 201


@bp.post("/<int:channel_id>/messages/<int:mid>/to-task")
@jwt_required()
def message_to_task(channel_id, mid):
    user = _get_current_user()
    channel = Channel.query.get_or_404(channel_id)
    err = _assert_channel_access(user, channel)
    if err:
        return err

    msg = Message.query.filter_by(id=mid, channel_id=channel_id).first_or_404()

    data = request.get_json() or {}
    title = (data.get("title") or msg.body[:200]).strip()

    task = Task(
        user_id=user.id,
        title=title,
        description=msg.body,
        priority=data.get("priority", "medium"),
        estimated_minutes=data.get("estimated_minutes"),
        scheduled_date=data.get("scheduled_date"),
    )
    db.session.add(task)
    db.session.flush()

    # Link message to task
    msg.task_id = task.id
    db.session.commit()

    return jsonify({"data": task.to_dict(), "message": "メッセージからタスクを作成しました"}), 201
