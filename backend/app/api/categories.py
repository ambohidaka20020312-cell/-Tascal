from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.category import Category
from ..models.task import Task
from .. import db

bp = Blueprint("categories", __name__)


@bp.get("")
@jwt_required()
def list_categories():
    user_id = get_jwt_identity()
    categories = Category.query.filter_by(user_id=user_id).order_by(Category.name.asc()).all()
    return jsonify({"data": [c.to_dict() for c in categories]})


@bp.post("")
@jwt_required()
def create_category():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "カテゴリ名は必須です"}}), 400

    if len(name) > 50:
        return jsonify({"error": {"code": "VALIDATION_ERROR", "message": "カテゴリ名は50文字以内にしてください"}}), 400

    existing = Category.query.filter_by(user_id=user_id, name=name).first()
    if existing:
        return jsonify({"error": {"code": "CONFLICT", "message": "同じ名前のカテゴリが既に存在します"}}), 409

    category = Category(
        user_id=user_id,
        name=name,
        color=data.get("color", "#888888"),
    )
    db.session.add(category)
    db.session.commit()
    return jsonify({"data": category.to_dict(), "message": "カテゴリを作成しました"}), 201


@bp.put("/<int:category_id>")
@jwt_required()
def update_category(category_id):
    user_id = get_jwt_identity()
    category = Category.query.filter_by(id=category_id, user_id=user_id).first_or_404()

    data = request.get_json() or {}

    if "name" in data:
        name = data["name"].strip()
        if not name:
            return jsonify({"error": {"code": "VALIDATION_ERROR", "message": "カテゴリ名は必須です"}}), 400
        if len(name) > 50:
            return jsonify({"error": {"code": "VALIDATION_ERROR", "message": "カテゴリ名は50文字以内にしてください"}}), 400
        existing = Category.query.filter(
            Category.user_id == user_id,
            Category.name == name,
            Category.id != category_id,
        ).first()
        if existing:
            return jsonify({"error": {"code": "CONFLICT", "message": "同じ名前のカテゴリが既に存在します"}}), 409
        category.name = name

    if "color" in data:
        category.color = data["color"]

    db.session.commit()
    return jsonify({"data": category.to_dict()})


@bp.delete("/<int:category_id>")
@jwt_required()
def delete_category(category_id):
    user_id = get_jwt_identity()
    category = Category.query.filter_by(id=category_id, user_id=user_id).first_or_404()

    # Null out tasks that reference this category
    Task.query.filter_by(category_id=category_id, user_id=user_id).update({"category_id": None})

    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "カテゴリを削除しました"})
