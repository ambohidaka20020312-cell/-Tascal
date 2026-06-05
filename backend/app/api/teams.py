from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User
from ..models.team import Team, TeamMember, TeamDepartment, TeamDepartmentMember
from .. import db
from ..utils.team_auth import require_team_seat

bp = Blueprint("teams", __name__)


def _get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(user_id)


@bp.post("")
@jwt_required()
def create_team():
    user = _get_current_user()
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "チーム名は必須です"}}), 400

    plan = data.get("plan", "team")
    if plan not in ("team", "enterprise"):
        plan = "team"
    max_seats = int(data.get("max_seats", 5))

    team = Team(name=name, owner_id=user.id, plan=plan, max_seats=max_seats)
    db.session.add(team)
    db.session.flush()  # get team.id

    member = TeamMember(team_id=team.id, user_id=user.id, role="owner")
    db.session.add(member)
    db.session.commit()
    return jsonify({"data": team.to_dict(), "message": "チームを作成しました"}), 201


@bp.get("/me")
@jwt_required()
def my_teams():
    user = _get_current_user()
    memberships = TeamMember.query.filter_by(user_id=user.id).all()
    result = []
    for m in memberships:
        team = Team.query.get(m.team_id)
        if team:
            d = team.to_dict()
            d["role"] = m.role
            result.append(d)
    return jsonify({"data": result})


@bp.post("/<int:team_id>/invite")
@jwt_required()
def invite_member(team_id):
    user = _get_current_user()
    err = require_team_seat(user, team_id)
    if err:
        return err

    # Only owner/admin can invite
    membership = TeamMember.query.filter_by(team_id=team_id, user_id=user.id).first()
    if membership.role not in ("owner", "admin"):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "招待権限がありません"}}), 403

    team = Team.query.get_or_404(team_id)

    # Check seat limit
    current_count = TeamMember.query.filter_by(team_id=team_id).count()
    if current_count >= team.max_seats:
        return jsonify({"error": {"code": "SEAT_LIMIT_REACHED", "message": "シート上限に達しています"}}), 400

    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "メールアドレスは必須です"}}), 400

    target_user = User.query.filter_by(email=email).first()
    if target_user:
        # Check if already a member
        existing = TeamMember.query.filter_by(team_id=team_id, user_id=target_user.id).first()
        if existing:
            return jsonify({"error": {"code": "ALREADY_MEMBER", "message": "すでにチームメンバーです"}}), 409
        new_member = TeamMember(team_id=team_id, user_id=target_user.id, role="member")
        db.session.add(new_member)
        db.session.commit()
        return jsonify({"data": new_member.to_dict(), "message": "メンバーを追加しました"}), 201
    else:
        # Send invitation email
        try:
            from flask_mail import Message as MailMessage
            from .. import mail
            import flask
            msg = MailMessage(
                subject=f"[Tascal] {team.name} チームへの招待",
                recipients=[email],
                body=(
                    f"{user.name} さんがあなたを Tascal の {team.name} チームに招待しました。\n\n"
                    "Tascal に登録してチームに参加してください。\n"
                    f"{flask.current_app.config.get('FRONTEND_URL', 'https://tascal.app')}/register"
                ),
            )
            mail.send(msg)
        except Exception as exc:
            import flask
            flask.current_app.logger.warning("Invite email failed: %s", exc)
        return jsonify({"message": "招待メールを送信しました（未登録ユーザー）"}), 200


@bp.delete("/<int:team_id>/members/<int:uid>")
@jwt_required()
def remove_member(team_id, uid):
    user = _get_current_user()
    err = require_team_seat(user, team_id)
    if err:
        return err

    membership = TeamMember.query.filter_by(team_id=team_id, user_id=user.id).first()
    # Allow self-removal or owner/admin removal
    if user.id != uid and membership.role not in ("owner", "admin"):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "メンバー削除権限がありません"}}), 403

    target = TeamMember.query.filter_by(team_id=team_id, user_id=uid).first_or_404()
    db.session.delete(target)
    db.session.commit()
    return jsonify({"message": "メンバーを削除しました"})


@bp.post("/<int:team_id>/departments")
@jwt_required()
def create_department(team_id):
    user = _get_current_user()
    err = require_team_seat(user, team_id)
    if err:
        return err

    membership = TeamMember.query.filter_by(team_id=team_id, user_id=user.id).first()
    if membership.role not in ("owner", "admin"):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "部署作成権限がありません"}}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "部署名は必須です"}}), 400

    dept = TeamDepartment(team_id=team_id, name=name)
    db.session.add(dept)
    db.session.commit()
    return jsonify({"data": dept.to_dict(), "message": "部署を作成しました"}), 201


@bp.get("/<int:team_id>/departments")
@jwt_required()
def list_departments(team_id):
    user = _get_current_user()
    err = require_team_seat(user, team_id)
    if err:
        return err

    depts = TeamDepartment.query.filter_by(team_id=team_id).all()
    return jsonify({"data": [d.to_dict() for d in depts]})


@bp.post("/<int:team_id>/departments/<int:did>/members")
@jwt_required()
def add_dept_member(team_id, did):
    user = _get_current_user()
    err = require_team_seat(user, team_id)
    if err:
        return err

    membership = TeamMember.query.filter_by(team_id=team_id, user_id=user.id).first()
    if membership.role not in ("owner", "admin"):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "部署メンバー追加権限がありません"}}), 403

    dept = TeamDepartment.query.filter_by(id=did, team_id=team_id).first_or_404()

    data = request.get_json() or {}
    target_user_id = data.get("user_id")
    if not target_user_id:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "user_id は必須です"}}), 400

    # Ensure target is a team member
    team_member = TeamMember.query.filter_by(team_id=team_id, user_id=target_user_id).first()
    if not team_member:
        return jsonify({"error": {"code": "NOT_TEAM_MEMBER", "message": "チームメンバーではないユーザーです"}}), 400

    existing = TeamDepartmentMember.query.filter_by(
        department_id=dept.id, user_id=target_user_id
    ).first()
    if existing:
        return jsonify({"error": {"code": "ALREADY_MEMBER", "message": "すでに部署メンバーです"}}), 409

    dm = TeamDepartmentMember(department_id=dept.id, user_id=target_user_id)
    db.session.add(dm)
    db.session.commit()
    return jsonify({"data": dm.to_dict(), "message": "部署にメンバーを追加しました"}), 201
