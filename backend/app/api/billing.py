import stripe
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User
from .. import db

bp = Blueprint("billing", __name__)

# Plan definitions for GET /billing/plans
PLANS = [
    {
        "id": "free",
        "name": "Free",
        "price": 0,
        "price_label": "¥0",
        "price_note": "ずっと無料",
        "category": "personal",
        "features": [
            "タスク 20件/月",
            "AI最適化 3回/日",
            "カレンダービュー",
            "広告表示あり",
        ],
    },
    {
        "id": "personal_pro",
        "name": "Personal Pro",
        "price": 980,
        "price_label": "¥980",
        "price_note": "/ 月",
        "category": "personal",
        "features": [
            "タスク 無制限",
            "AI最適化 無制限",
            "カレンダービュー",
            "広告非表示",
            "週次インサイト",
            "優先サポート",
        ],
    },
    {
        "id": "business",
        "name": "Business",
        "price": 4980,
        "price_label": "¥4,980",
        "price_note": "/ 月",
        "category": "business",
        "features": [
            "最大10名まで利用可能",
            "部署管理",
            "AIタスク振り分け",
            "ローカルLLM対応",
            "タスク 無制限",
            "AI最適化 無制限",
            "広告非表示",
        ],
    },
    {
        "id": "enterprise",
        "name": "Enterprise",
        "price": 19800,
        "price_label": "¥19,800〜",
        "price_note": "/ 月",
        "category": "business",
        "features": [
            "メンバー数 無制限",
            "SSO対応",
            "専用サポート",
            "カスタムAIモデル",
            "部署管理",
            "AIタスク振り分け",
            "ローカルLLM対応",
        ],
    },
]


def get_stripe():
    stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]
    return stripe


@bp.get("/plans")
def list_plans():
    """Return all available plans with pricing and features."""
    return jsonify({"data": PLANS})


@bp.post("/checkout")
@jwt_required()
def create_checkout():
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    price_map = {
        "pro": current_app.config["STRIPE_PRICE_ID_PRO"],
        "team": current_app.config["STRIPE_PRICE_ID_TEAM"],
        "personal_pro": current_app.config["STRIPE_PRICE_ID_PERSONAL_PRO"],
        "business": current_app.config["STRIPE_PRICE_ID_BUSINESS"],
        "enterprise": current_app.config["STRIPE_PRICE_ID_ENTERPRISE"],
    }
    price_id = price_map.get(data["plan"])
    if not price_id:
        return jsonify({"error": {"code": "INVALID_PLAN", "message": "無効なプランです"}}), 400

    s = get_stripe()
    session = s.checkout.Session.create(
        customer_email=user.email,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=data["success_url"],
        cancel_url=data["cancel_url"],
        metadata={"user_id": user_id},
    )
    return jsonify({"data": {"url": session.url}})


@bp.post("/portal")
@jwt_required()
def customer_portal():
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)

    if not user.stripe_customer_id:
        return jsonify({"error": {"code": "NO_SUBSCRIPTION", "message": "サブスクリプションが見つかりません"}}), 404

    s = get_stripe()
    session = s.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=request.get_json().get("return_url"),
    )
    return jsonify({"data": {"url": session.url}})


@bp.post("/webhook")
def webhook():
    payload = request.data
    sig_header = request.headers.get("Stripe-Signature")

    try:
        s = get_stripe()
        event = s.Webhook.construct_event(
            payload, sig_header, current_app.config["STRIPE_WEBHOOK_SECRET"]
        )
    except Exception:
        return jsonify({"error": "Invalid signature"}), 400

    if event["type"] == "checkout.session.completed":
        _handle_checkout_completed(event["data"]["object"])
    elif event["type"] in ("customer.subscription.updated", "customer.subscription.deleted"):
        _handle_subscription_change(event["data"]["object"])

    return jsonify({"received": True})


@bp.get("/subscription")
@jwt_required()
def get_subscription():
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    return jsonify({"data": {"plan": user.plan, "stripe_customer_id": user.stripe_customer_id}})


def _handle_checkout_completed(session):
    user_id = session["metadata"].get("user_id")
    if not user_id:
        return
    user = User.query.get(user_id)
    if user:
        user.stripe_customer_id = session["customer"]
        db.session.commit()


def _resolve_plan_from_price_id(price_id: str) -> str:
    """Map a Stripe price ID to our internal plan name."""
    mapping = {
        current_app.config.get("STRIPE_PRICE_ID_PERSONAL_PRO"): "personal_pro",
        current_app.config.get("STRIPE_PRICE_ID_BUSINESS"): "business",
        current_app.config.get("STRIPE_PRICE_ID_ENTERPRISE"): "enterprise",
        # Legacy price IDs kept for backwards compatibility
        current_app.config.get("STRIPE_PRICE_ID_PRO"): "personal_pro",
        current_app.config.get("STRIPE_PRICE_ID_TEAM"): "business",
    }
    return mapping.get(price_id, "personal_pro")


def _handle_subscription_change(subscription):
    customer_id = subscription["customer"]
    user = User.query.filter_by(stripe_customer_id=customer_id).first()
    if not user:
        return
    if subscription["status"] == "active":
        # Resolve plan name from the first subscription item's price ID
        items = subscription.get("items", {}).get("data", [])
        price_id = items[0]["price"]["id"] if items else None
        user.plan = _resolve_plan_from_price_id(price_id) if price_id else "personal_pro"
    else:
        user.plan = "free"
    db.session.commit()
