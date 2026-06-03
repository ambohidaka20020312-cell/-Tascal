from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .. import db
from ..models.organization import Organization, Department, OrganizationMember
from ..models.user import User

bp = Blueprint("organizations", __name__)


def _get_org_or_404(slug):
    org = Organization.query.filter_by(slug=slug).first()
    if not org:
        return None, (jsonify({"error": {"code": "ORG_NOT_FOUND", "message": "Organization not found"}}), 404)
    return org, None


def _require_role(org, user_id, roles):
    member = OrganizationMember.query.filter_by(org_id=org.id, user_id=user_id).first()
    if not member or member.role not in roles:
        return False
    return True


@bp.route("", methods=["POST"])
@jwt_required()
def create_org():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    slug = data.get("slug", "").strip()
    plan = data.get("plan", "business")
    max_members = data.get("max_members", 50)

    if not name or not slug:
        return jsonify({"error": {"code": "VALIDATION_ERROR", "message": "name and slug are required"}}), 400

    if Organization.query.filter_by(slug=slug).first():
        return jsonify({"error": {"code": "SLUG_TAKEN", "message": "Slug already in use"}}), 409

    org = Organization(name=name, slug=slug, plan=plan, owner_id=user_id, max_members=max_members)
    db.session.add(org)
    db.session.flush()

    owner_member = OrganizationMember(org_id=org.id, user_id=user_id, role="owner")
    db.session.add(owner_member)
    db.session.commit()

    return jsonify({"data": org.to_dict(), "message": "Organization created"}), 201


@bp.route("/<slug>", methods=["GET"])
@jwt_required()
def get_org(slug):
    org, err = _get_org_or_404(slug)
    if err:
        return err
    user_id = int(get_jwt_identity())
    if not _require_role(org, user_id, ["owner", "admin", "member"]):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Not a member of this organization"}}), 403

    return jsonify({"data": org.to_dict()}), 200


@bp.route("/<slug>/departments", methods=["POST"])
@jwt_required()
def create_department(slug):
    org, err = _get_org_or_404(slug)
    if err:
        return err
    user_id = int(get_jwt_identity())
    if not _require_role(org, user_id, ["owner", "admin"]):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Admin or owner role required"}}), 403

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    description = data.get("description", "")
    if not name:
        return jsonify({"error": {"code": "VALIDATION_ERROR", "message": "name is required"}}), 400

    dept = Department(org_id=org.id, name=name, description=description)
    db.session.add(dept)
    db.session.commit()

    return jsonify({"data": dept.to_dict(), "message": "Department created"}), 201


@bp.route("/<slug>/departments", methods=["GET"])
@jwt_required()
def list_departments(slug):
    org, err = _get_org_or_404(slug)
    if err:
        return err
    user_id = int(get_jwt_identity())
    if not _require_role(org, user_id, ["owner", "admin", "member"]):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Not a member"}}), 403

    depts = Department.query.filter_by(org_id=org.id).all()
    return jsonify({"data": [d.to_dict() for d in depts]}), 200


@bp.route("/<slug>/members/invite", methods=["POST"])
@jwt_required()
def invite_member(slug):
    org, err = _get_org_or_404(slug)
    if err:
        return err
    user_id = int(get_jwt_identity())
    if not _require_role(org, user_id, ["owner", "admin"]):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Admin or owner role required"}}), 403

    data = request.get_json() or {}
    email = data.get("email", "").strip()
    role = data.get("role", "member")
    department_id = data.get("department_id")

    if not email:
        return jsonify({"error": {"code": "VALIDATION_ERROR", "message": "email is required"}}), 400

    target_user = User.query.filter_by(email=email).first()
    if not target_user:
        return jsonify({"error": {"code": "USER_NOT_FOUND", "message": "No user with that email"}}), 404

    current_count = OrganizationMember.query.filter_by(org_id=org.id).count()
    if current_count >= org.max_members:
        return jsonify({"error": {"code": "MEMBER_LIMIT", "message": "Member limit reached"}}), 400

    existing = OrganizationMember.query.filter_by(org_id=org.id, user_id=target_user.id).first()
    if existing:
        return jsonify({"error": {"code": "ALREADY_MEMBER", "message": "User is already a member"}}), 409

    member = OrganizationMember(
        org_id=org.id,
        user_id=target_user.id,
        role=role,
        department_id=department_id,
    )
    db.session.add(member)
    db.session.commit()

    return jsonify({"data": member.to_dict(), "message": "Member invited"}), 201


@bp.route("/<slug>/members", methods=["GET"])
@jwt_required()
def list_members(slug):
    org, err = _get_org_or_404(slug)
    if err:
        return err
    user_id = int(get_jwt_identity())
    if not _require_role(org, user_id, ["owner", "admin", "member"]):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Not a member"}}), 403

    members = OrganizationMember.query.filter_by(org_id=org.id).all()
    result = []
    for m in members:
        d = m.to_dict()
        user = User.query.get(m.user_id)
        d["email"] = user.email if user else None
        d["name"] = getattr(user, "name", None) if user else None
        result.append(d)

    return jsonify({"data": result}), 200


@bp.route("/<slug>/members/<int:target_user_id>", methods=["PATCH"])
@jwt_required()
def update_member(slug, target_user_id):
    org, err = _get_org_or_404(slug)
    if err:
        return err
    user_id = int(get_jwt_identity())
    if not _require_role(org, user_id, ["owner", "admin"]):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Admin or owner role required"}}), 403

    member = OrganizationMember.query.filter_by(org_id=org.id, user_id=target_user_id).first()
    if not member:
        return jsonify({"error": {"code": "MEMBER_NOT_FOUND", "message": "Member not found"}}), 404

    data = request.get_json() or {}
    if "role" in data:
        member.role = data["role"]
    if "department_id" in data:
        member.department_id = data["department_id"]
    db.session.commit()

    return jsonify({"data": member.to_dict(), "message": "Member updated"}), 200
