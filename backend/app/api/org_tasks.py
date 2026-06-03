from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .. import db
from ..models.organization import Organization, Department, OrganizationMember
from ..models.task import Task
from ..services.org_ai_optimizer import OrgAIOptimizer

bp = Blueprint("org_tasks", __name__)


def _get_org_or_404(slug):
    org = Organization.query.filter_by(slug=slug).first()
    if not org:
        return None, (jsonify({"error": {"code": "ORG_NOT_FOUND", "message": "Organization not found"}}), 404)
    return org, None


def _require_member(org, user_id):
    return OrganizationMember.query.filter_by(org_id=org.id, user_id=user_id).first()


@bp.route("/<slug>/tasks", methods=["GET"])
@jwt_required()
def list_org_tasks(slug):
    org, err = _get_org_or_404(slug)
    if err:
        return err
    user_id = int(get_jwt_identity())
    if not _require_member(org, user_id):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Not a member"}}), 403

    query = Task.query.filter_by(org_id=org.id, is_deleted=False)

    dept_id = request.args.get("department_id", type=int)
    assigned_to = request.args.get("assigned_to", type=int)
    if dept_id:
        query = query.filter_by(department_id=dept_id)
    if assigned_to:
        query = query.filter_by(assigned_to=assigned_to)

    tasks = query.order_by(Task.sort_order).all()
    return jsonify({"data": [t.to_dict() for t in tasks]}), 200


@bp.route("/<slug>/tasks/distribute", methods=["POST"])
@jwt_required()
def distribute_tasks(slug):
    org, err = _get_org_or_404(slug)
    if err:
        return err
    user_id = int(get_jwt_identity())
    member = _require_member(org, user_id)
    if not member or member.role not in ("owner", "admin"):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Admin or owner role required"}}), 403

    data = request.get_json() or {}
    task_ids = data.get("task_ids")  # optional: specific task IDs to distribute

    query = Task.query.filter_by(org_id=org.id, is_deleted=False, assigned_to=None)
    if task_ids:
        query = query.filter(Task.id.in_(task_ids))
    tasks = query.all()

    if not tasks:
        return jsonify({"data": {"assignments": [], "ai_message": "振り分けるタスクがありません。"}}), 200

    members_raw = OrganizationMember.query.filter_by(org_id=org.id).all()
    departments_raw = Department.query.filter_by(org_id=org.id).all()

    members = [m.to_dict() for m in members_raw]
    departments = [d.to_dict() for d in departments_raw]
    tasks_data = [t.to_dict() for t in tasks]

    optimizer = OrgAIOptimizer()
    result = optimizer.distribute_tasks(org.id, tasks_data, members, departments)

    # Apply assignments to DB
    for assignment in result["assignments"]:
        task = Task.query.get(assignment["task_id"])
        if task:
            task.assigned_to = assignment["assigned_to"]
            task.department_id = assignment["department_id"]
    db.session.commit()

    return jsonify({"data": result, "message": "Tasks distributed"}), 200


@bp.route("/<slug>/analytics", methods=["GET"])
@jwt_required()
def org_analytics(slug):
    org, err = _get_org_or_404(slug)
    if err:
        return err
    user_id = int(get_jwt_identity())
    member = _require_member(org, user_id)
    if not member or member.role not in ("owner", "admin"):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Admin or owner role required"}}), 403

    optimizer = OrgAIOptimizer()
    result = optimizer.analyze_org_productivity(org.id)
    return jsonify({"data": result}), 200


@bp.route("/<slug>/dashboard", methods=["GET"])
@jwt_required()
def org_dashboard(slug):
    org, err = _get_org_or_404(slug)
    if err:
        return err
    user_id = int(get_jwt_identity())
    if not _require_member(org, user_id):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Not a member"}}), 403

    departments = Department.query.filter_by(org_id=org.id).all()
    members = OrganizationMember.query.filter_by(org_id=org.id).all()

    dept_summaries = []
    for dept in departments:
        total = Task.query.filter_by(org_id=org.id, department_id=dept.id, is_deleted=False).count()
        completed = Task.query.filter_by(
            org_id=org.id, department_id=dept.id, status="completed", is_deleted=False
        ).count()
        member_count = OrganizationMember.query.filter_by(org_id=org.id, department_id=dept.id).count()
        dept_summaries.append({
            "department_id": dept.id,
            "department_name": dept.name,
            "total_tasks": total,
            "completed_tasks": completed,
            "completion_rate": round(completed / total * 100, 1) if total > 0 else 0,
            "member_count": member_count,
        })

    member_loads = []
    for m in members:
        active = Task.query.filter_by(
            org_id=org.id, assigned_to=m.user_id, is_deleted=False
        ).filter(Task.status.in_(["pending", "in_progress"])).count()
        member_loads.append({"user_id": m.user_id, "role": m.role, "active_tasks": active})

    return jsonify({
        "data": {
            "org": org.to_dict(),
            "department_summaries": dept_summaries,
            "member_loads": member_loads,
            "total_members": len(members),
        }
    }), 200
