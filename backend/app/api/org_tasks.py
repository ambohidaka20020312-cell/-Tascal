import json
import datetime
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


# ---------------------------------------------------------------------------
# Hierarchical delegation endpoints
# ---------------------------------------------------------------------------

def _get_org_by_id_or_404(org_id):
    org = Organization.query.get(org_id)
    if not org:
        return None, (jsonify({"error": {"code": "ORG_NOT_FOUND", "message": "Organization not found"}}), 404)
    return org, None


@bp.route("/<int:org_id>/tasks/<int:task_id>/delegate", methods=["POST"])
@jwt_required()
def delegate_task(org_id, task_id):
    """
    Delegate a task to a department (owner, delegation_level=0)
    or to a specific user within the caller's department (manager, delegation_level=1).
    """
    org, err = _get_org_by_id_or_404(org_id)
    if err:
        return err

    caller_id = int(get_jwt_identity())
    caller_member = OrganizationMember.query.filter_by(org_id=org_id, user_id=caller_id).first()
    if not caller_member:
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Not a member of this organization"}}), 403
    if caller_member.role not in ("owner", "manager"):
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Owner or manager role required"}}), 403

    task = Task.query.filter_by(id=task_id, org_id=org_id, is_deleted=False).first()
    if not task:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Task not found"}}), 404

    data = request.get_json() or {}
    target_type = data.get("target_type")  # "department" or "user"
    target_id = data.get("target_id")

    if target_type not in ("department", "user") or target_id is None:
        return jsonify({"error": {"code": "VALIDATION_ERROR", "message": "target_type ('department'|'user') and target_id are required"}}), 400

    if caller_member.role == "owner":
        # Owner delegates to a department
        if target_type != "department":
            return jsonify({"error": {"code": "VALIDATION_ERROR", "message": "Owner can only delegate to a department"}}), 400
        dept = Department.query.filter_by(id=target_id, org_id=org_id).first()
        if not dept:
            return jsonify({"error": {"code": "NOT_FOUND", "message": "Department not found"}}), 404

        delegated = Task(
            user_id=task.user_id,
            title=task.title,
            description=task.description,
            priority=task.priority,
            status="pending",
            estimated_minutes=task.estimated_minutes,
            scheduled_date=task.scheduled_date,
            due_datetime=task.due_datetime,
            org_id=org_id,
            department_id=target_id,
            required_skills=task.required_skills,
            delegation_level=0,
            parent_task_id=task.id,
        )
        db.session.add(delegated)
        db.session.commit()
        return jsonify({"data": delegated.to_dict(), "message": "Task delegated to department"}), 201

    else:  # manager
        # Manager delegates to a member in their own department
        if target_type != "user":
            return jsonify({"error": {"code": "VALIDATION_ERROR", "message": "Manager can only delegate to a user"}}), 400

        target_member = OrganizationMember.query.filter_by(
            org_id=org_id, user_id=target_id, department_id=caller_member.department_id
        ).first()
        if not target_member:
            return jsonify({"error": {"code": "NOT_FOUND", "message": "Target user is not in your department"}}), 404

        delegated = Task(
            user_id=target_id,
            title=task.title,
            description=task.description,
            priority=task.priority,
            status="pending",
            estimated_minutes=task.estimated_minutes,
            scheduled_date=task.scheduled_date,
            due_datetime=task.due_datetime,
            org_id=org_id,
            department_id=caller_member.department_id,
            assigned_to=target_id,
            required_skills=task.required_skills,
            delegation_level=1,
            parent_task_id=task.id,
        )
        db.session.add(delegated)
        db.session.commit()
        return jsonify({"data": delegated.to_dict(), "message": "Task delegated to user"}), 201


@bp.route("/<int:org_id>/tasks/received", methods=["GET"])
@jwt_required()
def received_tasks(org_id):
    """
    Returns tasks delegated to the caller's department (delegation_level=0).
    """
    org, err = _get_org_by_id_or_404(org_id)
    if err:
        return err

    caller_id = int(get_jwt_identity())
    member = OrganizationMember.query.filter_by(org_id=org_id, user_id=caller_id).first()
    if not member:
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Not a member of this organization"}}), 403

    if not member.department_id:
        return jsonify({"data": []}), 200

    tasks = Task.query.filter_by(
        org_id=org_id,
        department_id=member.department_id,
        delegation_level=0,
        is_deleted=False,
    ).order_by(Task.created_at.desc()).all()

    return jsonify({"data": [t.to_dict() for t in tasks]}), 200
