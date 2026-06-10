from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from .. import db
from ..models.organization import Organization, Department, OrganizationMember, OrgInvite
from ..models.user import User
import datetime
import re

bp = Blueprint("organizations", __name__)


def _uid():
    return int(get_jwt_identity())


def _get_org(org_id):
    return Organization.query.get_or_404(org_id)


def _membership(org_id, user_id):
    return OrganizationMember.query.filter_by(org_id=org_id, user_id=user_id).first()


def _require_roles(org_id, user_id, roles):
    m = _membership(org_id, user_id)
    if not m or m.role not in roles:
        return jsonify({"error": {"code": "FORBIDDEN", "message": "権限がありません"}}), 403
    return None


def _make_slug(name):
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "org"
    base = slug[:80]
    candidate = base
    i = 2
    while Organization.query.filter_by(slug=candidate).first():
        candidate = f"{base}-{i}"
        i += 1
    return candidate


def _send_invite_email(to_email, inviter_name, org_name, token):
    try:
        from flask_mail import Message as MailMessage
        from .. import mail
        frontend_url = current_app.config.get("FRONTEND_URL", "https://tascal-frontend.onrender.com")
        link = f"{frontend_url}/join-team?token={token}"
        msg = MailMessage(
            subject=f"[Tascal] {org_name} チームへの招待",
            recipients=[to_email],
            body=(
                f"{inviter_name} さんからTascalの {org_name} チームに招待されました。\n\n"
                f"以下のリンクから参加してください（72時間有効）:\n{link}\n\n"
                "Tascalをまだお使いでない場合は、リンクから新規登録してご参加ください。"
            ),
        )
        mail.send(msg)
    except Exception as exc:
        current_app.logger.warning("Invite email failed: %s", exc)


# ── GET /org — current user's org ──────────────────────────────────────────────
@bp.get("")
@jwt_required()
def get_my_org():
    user_id = _uid()
    m = OrganizationMember.query.filter_by(user_id=user_id).first()
    if not m:
        return jsonify({"data": None}), 200
    org = Organization.query.get(m.org_id)
    if not org:
        return jsonify({"data": None}), 200
    d = org.to_dict()
    d["role"] = m.role
    return jsonify({"data": d}), 200


# ── POST /org — create org ─────────────────────────────────────────────────────
@bp.post("")
@jwt_required()
def create_org():
    user_id = _uid()
    # One org per user (as owner)
    existing_owner = Organization.query.filter_by(owner_id=user_id).first()
    if existing_owner:
        return jsonify({"error": {"code": "ALREADY_OWNER", "message": "すでにチームのオーナーです"}}), 409

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "チーム名は必須です"}}), 400

    slug = _make_slug(name)
    org = Organization(name=name, slug=slug, plan="business", owner_id=user_id, max_members=50)
    db.session.add(org)
    db.session.flush()

    owner_member = OrganizationMember(org_id=org.id, user_id=user_id, role="owner")
    db.session.add(owner_member)
    db.session.commit()

    d = org.to_dict()
    d["role"] = "owner"
    return jsonify({"data": d, "message": "チームを作成しました"}), 201


# ── GET /org/<id>/members ──────────────────────────────────────────────────────
@bp.get("/<int:org_id>/members")
@jwt_required()
def list_members(org_id):
    user_id = _uid()
    err = _require_roles(org_id, user_id, ["owner", "admin", "member"])
    if err:
        return err
    members = OrganizationMember.query.filter_by(org_id=org_id).all()
    result = []
    for m in members:
        user = User.query.get(m.user_id)
        result.append({
            "id": m.user_id,
            "org_member_id": m.id,
            "name": user.name if user else "",
            "email": user.email if user else "",
            "role": m.role,
            "joined_at": m.joined_at.isoformat(),
        })
    return jsonify({"data": result}), 200


# ── POST /org/<id>/invite ──────────────────────────────────────────────────────
@bp.post("/<int:org_id>/invite")
@jwt_required()
def invite_member(org_id):
    user_id = _uid()
    err = _require_roles(org_id, user_id, ["owner", "admin"])
    if err:
        return err

    org = _get_org(org_id)
    inviter = User.query.get(user_id)

    current_count = OrganizationMember.query.filter_by(org_id=org_id).count()
    if current_count >= org.max_members:
        return jsonify({"error": {"code": "MEMBER_LIMIT", "message": "メンバー上限に達しています"}}), 400

    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "メールアドレスは必須です"}}), 400

    target_user = User.query.filter_by(email=email).first()
    if target_user:
        existing = _membership(org_id, target_user.id)
        if existing:
            return jsonify({"error": {"code": "ALREADY_MEMBER", "message": "すでにメンバーです"}}), 409
        member = OrganizationMember(org_id=org_id, user_id=target_user.id, role="member")
        db.session.add(member)
        db.session.commit()
        _send_invite_email(email, inviter.name or "メンバー", org.name, "")
        return jsonify({"message": "メンバーを追加しました"}), 201
    else:
        # Create invite token
        token = OrgInvite.generate_token()
        invite = OrgInvite(
            org_id=org_id,
            email=email,
            token=token,
            invited_by=user_id,
            expires_at=datetime.datetime.utcnow() + datetime.timedelta(hours=72),
        )
        db.session.add(invite)
        db.session.commit()
        _send_invite_email(email, inviter.name or "メンバー", org.name, token)
        return jsonify({"message": "招待メールを送信しました"}), 200


# ── DELETE /org/<id>/members/<uid> ────────────────────────────────────────────
@bp.delete("/<int:org_id>/members/<int:target_user_id>")
@jwt_required()
def remove_member(org_id, target_user_id):
    user_id = _uid()
    # Allow self-removal OR owner/admin
    if user_id != target_user_id:
        err = _require_roles(org_id, user_id, ["owner", "admin"])
        if err:
            return err
    member = OrganizationMember.query.filter_by(org_id=org_id, user_id=target_user_id).first_or_404()
    # Cannot remove owner
    if member.role == "owner":
        return jsonify({"error": {"code": "CANNOT_REMOVE_OWNER", "message": "オーナーは削除できません"}}), 400
    db.session.delete(member)
    db.session.commit()
    return jsonify({"message": "メンバーを削除しました"}), 200


# ── PATCH /org/<id>/members/<uid> — update role ───────────────────────────────
@bp.patch("/<int:org_id>/members/<int:target_user_id>")
@jwt_required()
def update_member_role(org_id, target_user_id):
    user_id = _uid()
    # Only owner can change roles
    err = _require_roles(org_id, user_id, ["owner"])
    if err:
        return err

    member = OrganizationMember.query.filter_by(org_id=org_id, user_id=target_user_id).first_or_404()
    if member.role == "owner":
        return jsonify({"error": {"code": "CANNOT_CHANGE_OWNER", "message": "オーナーのロールは変更できません"}}), 400

    data = request.get_json() or {}
    new_role = data.get("role")
    if new_role not in ("admin", "member"):
        return jsonify({"error": {"code": "INVALID_ROLE", "message": "ロールは admin または member です"}}), 400

    member.role = new_role
    db.session.commit()
    return jsonify({"message": f"ロールを {new_role} に変更しました"}), 200


# ── GET /org/accept-invite?token=xxx ─────────────────────────────────────────
@bp.get("/accept-invite")
@jwt_required()
def accept_invite():
    user_id = _uid()
    token = request.args.get("token", "")
    if not token:
        return jsonify({"error": {"code": "MISSING_TOKEN", "message": "トークンが必要です"}}), 400

    invite = OrgInvite.query.filter_by(token=token).first()
    if not invite or not invite.is_valid():
        return jsonify({"error": {"code": "INVALID_TOKEN", "message": "招待リンクが無効または期限切れです"}}), 400

    existing = _membership(invite.org_id, user_id)
    if existing:
        invite.accepted_at = datetime.datetime.utcnow()
        db.session.commit()
        return jsonify({"message": "すでにメンバーです"}), 200

    member = OrganizationMember(org_id=invite.org_id, user_id=user_id, role="member")
    db.session.add(member)
    invite.accepted_at = datetime.datetime.utcnow()
    db.session.commit()

    org = Organization.query.get(invite.org_id)
    return jsonify({"data": {"org_id": invite.org_id, "org_name": org.name if org else ""}, "message": "チームに参加しました"}), 200


# ── GET /org/<id>/departments ──────────────────────────────────────────────────
@bp.get("/<int:org_id>/departments")
@jwt_required()
def list_departments(org_id):
    user_id = _uid()
    err = _require_roles(org_id, user_id, ["owner", "admin", "member"])
    if err:
        return err
    depts = Department.query.filter_by(org_id=org_id).all()
    return jsonify({"data": [d.to_dict() for d in depts]}), 200


# ── POST /org/<id>/departments ─────────────────────────────────────────────────
@bp.post("/<int:org_id>/departments")
@jwt_required()
def create_department(org_id):
    user_id = _uid()
    err = _require_roles(org_id, user_id, ["owner", "admin"])
    if err:
        return err
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "部署名は必須です"}}), 400
    dept = Department(org_id=org_id, name=name, description=data.get("description", ""))
    db.session.add(dept)
    db.session.commit()
    return jsonify({"data": dept.to_dict(), "message": "部署を作成しました"}), 201


# ── DELETE /org/<id>/departments/<did> ────────────────────────────────────────
@bp.delete("/<int:org_id>/departments/<int:dept_id>")
@jwt_required()
def delete_department(org_id, dept_id):
    user_id = _uid()
    err = _require_roles(org_id, user_id, ["owner", "admin"])
    if err:
        return err
    dept = Department.query.filter_by(id=dept_id, org_id=org_id).first_or_404()
    db.session.delete(dept)
    db.session.commit()
    return jsonify({"message": "部署を削除しました"}), 200


# ── POST /org/<id>/departments/<did>/members ──────────────────────────────────
@bp.post("/<int:org_id>/departments/<int:dept_id>/members")
@jwt_required()
def add_dept_member(org_id, dept_id):
    user_id = _uid()
    err = _require_roles(org_id, user_id, ["owner", "admin"])
    if err:
        return err
    data = request.get_json() or {}
    target_user_id = data.get("user_id")
    if not target_user_id:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "user_id は必須です"}}), 400
    member = _membership(org_id, target_user_id)
    if not member:
        return jsonify({"error": {"code": "NOT_MEMBER", "message": "チームメンバーではありません"}}), 400
    member.department_id = dept_id
    db.session.commit()
    return jsonify({"message": "部署に割り当てました"}), 200
