from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from ..models.user import User
from .. import db

bp = Blueprint("auth", __name__)


@bp.post("/register")
def register():
    data = request.get_json() or {}
    if not data.get("email") or not data.get("password"):
        return jsonify({"error": {"code": "MISSING_FIELDS", "message": "email と password は必須です"}}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": {"code": "EMAIL_EXISTS", "message": "このメールアドレスは既に使用されています"}}), 409

    user = User(email=data["email"], name=data.get("name", ""))
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    return jsonify({
        "data": {"user": user.to_dict()},
        "message": "登録が完了しました"
    }), 201


@bp.post("/login")
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data["email"]).first()

    if not user or not user.check_password(data["password"]):
        return jsonify({"error": {"code": "INVALID_CREDENTIALS", "message": "メールアドレスまたはパスワードが正しくありません"}}), 401

    return jsonify({
        "data": {
            "access_token": create_access_token(identity=str(user.id)),
            "refresh_token": create_refresh_token(identity=str(user.id)),
            "user": user.to_dict(),
        }
    })


@bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    return jsonify({"data": {"access_token": create_access_token(identity=user_id)}})
