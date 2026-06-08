from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User
from ..models.team import TeamMember
from ..models.channel import Channel, ChannelMember, Message
from ..models.task import Task
from .. import db
from ..utils.team_auth import require_team_seat, get_user_team
from ..utils.audit import log_action
import datetime
import json
import re

bp = Blueprint("channels", __name__)


def _extract_mentions(body: str, team_id: int) -> list:
    """
    Parse @username and @channel mentions from message body.
    Returns list of {"type": "user"|"channel", "id": int, "name": str}
    """
    mentions = []
    # @username pattern
    at_names = re.findall(r'@(\S+)', body)
    for name in at_names:
        # Try user match
        user = User.query.filter(User.name.ilike(name)).first()
        if user:
            tm = TeamMember.query.filter_by(team_id=team_id, user_id=user.id).first()
            if tm:
                mentions.append({"type": "user", "id": user.id, "name": user.name})
                continue
        # Try channel match
        channel = Channel.query.filter(
            Channel.team_id == team_id,
            Channel.name.ilike(name),
        ).first()
        if channel:
            mentions.append({"type": "channel", "id": channel.id, "name": channel.name})
    return mentions


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

    # DM: auto-create task for the other party if add_task=true
    if channel.channel_type == "dm" and data.get("add_task"):
        other_member = ChannelMember.query.filter(
            ChannelMember.channel_id == channel_id,
            ChannelMember.user_id != user.id,
        ).first()
        if other_member:
            auto_task = Task(
                user_id=other_member.user_id,
                assigned_to=other_member.user_id,
                title=data.get("task_title") or body[:200],
                description=body,
                priority=data.get("priority", "medium"),
                estimated_minutes=data.get("estimated_minutes"),
                scheduled_date=data.get("scheduled_date"),
            )
            db.session.add(auto_task)
            db.session.flush()

    # Group channel: @channel mention required for task posting
    if channel.channel_type == "group" and data.get("add_task"):
        channel_mention = f"@{channel.name}"
        if channel_mention.lower() not in body.lower():
            return jsonify({
                "error": {
                    "code": "CHANNEL_MENTION_REQUIRED",
                    "message": f"グループへのタスク投稿には {channel_mention} のメンションが必要です",
                }
            }), 400

    mentions = _extract_mentions(body, channel.team_id)
    msg = Message(
        channel_id=channel_id,
        sender_id=user.id,
        body=body,
        mentions=json.dumps(mentions) if mentions else None,
        message_type="task_created" if data.get("add_task") else "text",
    )
    db.session.add(msg)
    db.session.commit()

    # Notify mentioned users specifically
    for mention in mentions:
        if mention["type"] == "user":
            mentioned_user = User.query.get(mention["id"])
            if mentioned_user and mentioned_user.id != user.id:
                try:
                    from .notifications import send_push
                    send_push(
                        mentioned_user,
                        title=f"@{user.name or 'Tascal'} があなたをメンションしました",
                        body=body[:100],
                        url=f"/chat/{channel_id}",
                    )
                except Exception:
                    pass

    # Send Web Push to all channel members except the sender
    try:
        from .notifications import send_push
        members = ChannelMember.query.filter(
            ChannelMember.channel_id == channel_id,
            ChannelMember.user_id != user.id,
        ).all()
        for member in members:
            recipient = User.query.get(member.user_id)
            if recipient:
                send_push(
                    recipient,
                    title=f"{user.name or 'Tascal'} からメッセージ",
                    body=body[:100],
                    url=f"/chat/{channel_id}",
                )
    except Exception:
        pass

    return jsonify({"data": msg.to_dict(), "message": "メッセージを送信しました"}), 201


@bp.delete("/<int:channel_id>/messages/<int:mid>")
@jwt_required()
def delete_message(channel_id, mid):
    """Delete a message — placeholder for future moderation. Audit logged for SOC2."""
    user = _get_current_user()
    channel = Channel.query.get_or_404(channel_id)
    err = _assert_channel_access(user, channel)
    if err:
        return err

    msg = Message.query.filter_by(id=mid, channel_id=channel_id).first_or_404()

    # Only sender or team owner/admin can delete
    membership = TeamMember.query.filter_by(team_id=channel.team_id, user_id=user.id).first()
    is_admin = membership and membership.role in ("owner", "admin")
    if msg.sender_id != user.id and not is_admin:
        return jsonify({"error": {"code": "FORBIDDEN", "message": "このメッセージを削除する権限がありません"}}), 403

    db.session.delete(msg)
    log_action(user.id, "message.delete", resource_type="channel", resource_id=channel_id,
               extra={"message_id": mid})
    db.session.commit()
    return jsonify({"message": "メッセージを削除しました"})


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


@bp.post("/<int:channel_id>/post-task")
@jwt_required()
def post_task_to_channel(channel_id):
    """
    タスク作成画面からチャンネルに通知を投稿する。
    タスク作成後にchannel_idを指定して呼ぶと、チャンネルに
    「タスクが追加されました」メッセージが自動投稿される。
    """
    user = _get_current_user()
    channel = Channel.query.get_or_404(channel_id)
    err = _assert_channel_access(user, channel)
    if err:
        return err

    data = request.get_json() or {}
    task_id = data.get("task_id")
    task = Task.query.get_or_404(task_id)

    # Build message body with @mention
    assignee = User.query.get(task.assigned_to) if task.assigned_to else None
    assignee_mention = f"@{assignee.name}" if assignee else ""

    priority_label = {"urgent": "🔴 緊急", "high": "🟠 高", "medium": "🟡 中", "low": "🟢 低"}.get(task.priority, "中")
    due = task.scheduled_date.strftime("%m/%d") if task.scheduled_date else "未定"

    body = (
        f"📋 タスクが追加されました\n"
        f"「{task.title}」\n"
        f"優先度: {priority_label}　期日: {due}"
        + (f"　担当: {assignee_mention}" if assignee_mention else "")
    )

    # Parse mentions from body (picks up @name automatically)
    mentions = _extract_mentions(body, channel.team_id)

    msg = Message(
        channel_id=channel_id,
        sender_id=user.id,
        body=body,
        task_id=task_id,
        message_type="task_created",
        mentions=json.dumps(mentions) if mentions else None,
    )
    db.session.add(msg)
    db.session.commit()

    # Push notifications via unified mention handler
    for mention in mentions:
        if mention["type"] == "user" and mention["id"] != user.id:
            mentioned_user = User.query.get(mention["id"])
            if mentioned_user:
                try:
                    from .notifications import send_push
                    send_push(
                        mentioned_user,
                        title="新しいタスクがアサインされました",
                        body=task.title,
                        url="/app/tasks",
                    )
                except Exception:
                    pass

    return jsonify({"data": msg.to_dict(), "message": "チャンネルに投稿しました"}), 201


@bp.get("/<int:channel_id>/mention-suggestions")
@jwt_required()
def mention_suggestions(channel_id):
    """
    @メンション候補を返す（ユーザー名・チャンネル名）
    クエリパラメータ: q=入力中の文字列
    """
    user = _get_current_user()
    channel = Channel.query.get_or_404(channel_id)
    err = _assert_channel_access(user, channel)
    if err:
        return err

    q = (request.args.get("q") or "").strip().lower()

    # Team members
    members = TeamMember.query.filter_by(team_id=channel.team_id).all()
    users = []
    for m in members:
        u = User.query.get(m.user_id)
        if u and (not q or q in u.name.lower()):
            users.append({"type": "user", "id": u.id, "name": u.name})

    # Channels in same team
    channels = Channel.query.filter(
        Channel.team_id == channel.team_id,
        Channel.channel_type == "group",
    ).all()
    channel_list = []
    for c in channels:
        if not q or q in c.name.lower():
            channel_list.append({"type": "channel", "id": c.id, "name": c.name})

    return jsonify({"data": {"users": users, "channels": channel_list}})


@bp.post("/smart-assign")
@jwt_required()
def smart_assign_endpoint():
    """
    AIスマートアサイン：タスク内容・スキル・現在のワークロードから
    最適な担当者を提案する。
    """
    user = _get_current_user()
    team = get_user_team(user)
    if not team:
        return jsonify({"error": {"code": "TEAM_SEAT_REQUIRED", "message": "チームに所属していません"}}), 403

    data = request.get_json() or {}
    required_skills = data.get("required_skills", [])
    exclude_self = data.get("exclude_self", False)

    from ..services.smart_assign import smart_assign
    result = smart_assign(
        team_id=team.id,
        required_skills=required_skills,
        exclude_user_id=user.id if exclude_self else None,
    )

    return jsonify({"data": result})
