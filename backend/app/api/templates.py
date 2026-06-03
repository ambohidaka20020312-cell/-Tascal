from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.task_template import TaskTemplate
from ..models.task import Task
from .. import db
import datetime

bp = Blueprint("templates", __name__)


@bp.get("")
@jwt_required()
def list_templates():
    user_id = get_jwt_identity()
    templates = (
        TaskTemplate.query.filter_by(user_id=user_id)
        .order_by(TaskTemplate.use_count.desc())
        .all()
    )
    return jsonify({"data": [t.to_dict() for t in templates]})


@bp.post("")
@jwt_required()
def create_template():
    user_id = get_jwt_identity()
    body = request.get_json() or {}
    if not body.get("name") or not body.get("title"):
        return jsonify({"error": {"code": "INVALID_INPUT", "message": "name and title are required"}}), 400

    template = TaskTemplate(
        user_id=user_id,
        name=body["name"],
        title=body["title"],
        description=body.get("description", ""),
        priority=body.get("priority", "medium"),
        estimated_minutes=body.get("estimated_minutes"),
        category=body.get("category"),
        tags=body.get("tags"),
    )
    db.session.add(template)
    db.session.commit()
    return jsonify({"data": template.to_dict(), "message": "created"}), 201


@bp.put("/<int:template_id>")
@jwt_required()
def update_template(template_id: int):
    user_id = get_jwt_identity()
    template = TaskTemplate.query.filter_by(id=template_id, user_id=user_id).first()
    if not template:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "template not found"}}), 404

    body = request.get_json() or {}
    for field in ("name", "title", "description", "priority", "estimated_minutes", "category", "tags"):
        if field in body:
            setattr(template, field, body[field])
    template.updated_at = datetime.datetime.utcnow()
    db.session.commit()
    return jsonify({"data": template.to_dict()})


@bp.delete("/<int:template_id>")
@jwt_required()
def delete_template(template_id: int):
    user_id = get_jwt_identity()
    template = TaskTemplate.query.filter_by(id=template_id, user_id=user_id).first()
    if not template:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "template not found"}}), 404

    db.session.delete(template)
    db.session.commit()
    return jsonify({"message": "deleted"})


@bp.post("/<int:template_id>/use")
@jwt_required()
def use_template(template_id: int):
    user_id = get_jwt_identity()
    template = TaskTemplate.query.filter_by(id=template_id, user_id=user_id).first()
    if not template:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "template not found"}}), 404

    body = request.get_json() or {}
    scheduled_date_str = body.get("scheduled_date")
    if scheduled_date_str:
        scheduled_date = datetime.date.fromisoformat(scheduled_date_str)
    else:
        scheduled_date = datetime.date.today()

    task = Task(
        user_id=user_id,
        title=template.title,
        description=template.description,
        priority=template.priority,
        estimated_minutes=template.estimated_minutes,
        scheduled_date=scheduled_date,
    )
    db.session.add(task)

    template.use_count += 1
    template.updated_at = datetime.datetime.utcnow()

    db.session.commit()
    return jsonify({"data": task.to_dict(), "message": "task created from template"}), 201
