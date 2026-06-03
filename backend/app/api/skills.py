from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .. import db
from ..models.organization import Organization, OrganizationMember
from ..models.member_skill import MemberSkill

bp = Blueprint("skills", __name__)

MANAGER_ROLES = ("owner", "manager")


def _get_org_or_404(org_id):
    org = Organization.query.get(org_id)
    if not org:
        return None, (jsonify({"error": {"code": "ORG_NOT_FOUND", "message": "Organization not found"}}), 404)
    return org, None


def _require_manager(org_id, user_id):
    """Returns the member record if the caller is manager or above, else None."""
    return OrganizationMember.query.filter_by(
        org_id=org_id, user_id=user_id
    ).filter(OrganizationMember.role.in_(MANAGER_ROLES)).first()


def _require_member(org_id, user_id):
    return OrganizationMember.query.filter_by(org_id=org_id, user_id=user_id).first()


@bp.route("/org/<int:org_id>/members/<int:target_user_id>/skills", methods=["GET"])
@jwt_required()
def list_skills(org_id, target_user_id):
    org, err = _get_org_or_404(org_id)
    if err:
        return err
    caller_id = int(get_jwt_identity())
    if not _require_member(org_id, caller_id):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Not a member of this organization"}}), 403

    skills = MemberSkill.query.filter_by(user_id=target_user_id).all()
    return jsonify({"data": [s.to_dict() for s in skills]}), 200


@bp.route("/org/<int:org_id>/members/<int:target_user_id>/skills", methods=["POST"])
@jwt_required()
def add_skill(org_id, target_user_id):
    org, err = _get_org_or_404(org_id)
    if err:
        return err
    caller_id = int(get_jwt_identity())
    if not _require_manager(org_id, caller_id):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Manager or owner role required"}}), 403

    # Ensure target user is a member of the org
    if not _require_member(org_id, target_user_id):
        return jsonify({"error": {"code": "USER_NOT_MEMBER", "message": "Target user is not a member"}}), 404

    data = request.get_json() or {}
    skill_tag = data.get("skill_tag", "").strip()
    level = data.get("level", 1)

    if not skill_tag:
        return jsonify({"error": {"code": "VALIDATION_ERROR", "message": "skill_tag is required"}}), 400
    if not isinstance(level, int) or level < 1 or level > 5:
        return jsonify({"error": {"code": "VALIDATION_ERROR", "message": "level must be an integer between 1 and 5"}}), 400

    existing = MemberSkill.query.filter_by(user_id=target_user_id, skill_tag=skill_tag).first()
    if existing:
        return jsonify({"error": {"code": "DUPLICATE_SKILL", "message": "Skill tag already exists for this user"}}), 409

    skill = MemberSkill(user_id=target_user_id, skill_tag=skill_tag, level=level)
    db.session.add(skill)
    db.session.commit()
    return jsonify({"data": skill.to_dict(), "message": "Skill added"}), 201


@bp.route("/org/<int:org_id>/members/<int:target_user_id>/skills/<int:skill_id>", methods=["PUT"])
@jwt_required()
def update_skill(org_id, target_user_id, skill_id):
    org, err = _get_org_or_404(org_id)
    if err:
        return err
    caller_id = int(get_jwt_identity())
    if not _require_manager(org_id, caller_id):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Manager or owner role required"}}), 403

    skill = MemberSkill.query.filter_by(id=skill_id, user_id=target_user_id).first()
    if not skill:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Skill not found"}}), 404

    data = request.get_json() or {}
    level = data.get("level")
    if level is not None:
        if not isinstance(level, int) or level < 1 or level > 5:
            return jsonify({"error": {"code": "VALIDATION_ERROR", "message": "level must be an integer between 1 and 5"}}), 400
        skill.level = level

    skill_tag = data.get("skill_tag", "").strip()
    if skill_tag:
        skill.skill_tag = skill_tag

    db.session.commit()
    return jsonify({"data": skill.to_dict(), "message": "Skill updated"}), 200


@bp.route("/org/<int:org_id>/members/<int:target_user_id>/skills/<int:skill_id>", methods=["DELETE"])
@jwt_required()
def delete_skill(org_id, target_user_id, skill_id):
    org, err = _get_org_or_404(org_id)
    if err:
        return err
    caller_id = int(get_jwt_identity())
    if not _require_manager(org_id, caller_id):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Manager or owner role required"}}), 403

    skill = MemberSkill.query.filter_by(id=skill_id, user_id=target_user_id).first()
    if not skill:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Skill not found"}}), 404

    db.session.delete(skill)
    db.session.commit()
    return jsonify({"data": None, "message": "Skill deleted"}), 200
