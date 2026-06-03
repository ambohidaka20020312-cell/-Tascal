import os
import stripe
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User
from .. import db

bp = Blueprint("billing", __name__)

PRICE_TO_PLAN = {
    os.getenv("STRIPE_PRICE_ID_PRO"): "pro",
    os.getenv("STRIPE_PRICE_ID_TEAM"): "team",
}

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

    if not sig_header:
        return jsonify({"error": {"code": "MISSING_SIGNATURE", "message": "Stripe-Signature header is required"}}), 400

    try:
        s = get_stripe()
        event = s.Webhook.construct_event(
            payload, sig_header, current_app.config["STRIPE_WEBHOOK_SECRET"]
        )
    except Exception:
        return jsonify({"error": {"code": "INVALID_SIGNATURE", "message": "Invalid signature"}}), 400

    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(obj)
    elif event_type in ("customer.subscription.created", "customer.subscription.updated"):
        _handle_subscription_upsert(obj)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(obj)
    elif event_type == "invoice.payment_succeeded":
        current_app.logger.info(
            "invoice.payment_succeeded: invoice=%s customer=%s",
            obj.get("id"),
            obj.get("customer"),
        )
    elif event_type == "invoice.payment_failed":
        _handle_payment_failed(obj)

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
    # Check env-var-based PRICE_TO_PLAN first (pro/team)
    env_plan = PRICE_TO_PLAN.get(price_id)
    if env_plan:
        return env_plan
    # Then check app-config extended mapping
    mapping = {
        current_app.config.get("STRIPE_PRICE_ID_PERSONAL_PRO"): "personal_pro",
        current_app.config.get("STRIPE_PRICE_ID_BUSINESS"): "business",
        current_app.config.get("STRIPE_PRICE_ID_ENTERPRISE"): "enterprise",
        # Legacy price IDs kept for backwards compatibility
        current_app.config.get("STRIPE_PRICE_ID_PRO"): "personal_pro",
        current_app.config.get("STRIPE_PRICE_ID_TEAM"): "business",
    }
    return mapping.get(price_id, "personal_pro")


def _handle_subscription_upsert(subscription):
    """Handle customer.subscription.created and customer.subscription.updated."""
    customer_id = subscription["customer"]
    user = User.query.filter_by(stripe_customer_id=customer_id).first()
    if not user:
        return
    items = subscription.get("items", {}).get("data", [])
    price_id = items[0]["price"]["id"] if items else None
    if subscription["status"] == "active":
        user.plan = _resolve_plan_from_price_id(price_id) if price_id else "personal_pro"
    else:
        user.plan = "free"
    user.stripe_subscription_id = subscription.get("id")
    db.session.commit()


def _handle_subscription_deleted(subscription):
    """Handle customer.subscription.deleted → downgrade to free."""
    customer_id = subscription["customer"]
    user = User.query.filter_by(stripe_customer_id=customer_id).first()
    if not user:
        return
    user.plan = "free"
    user.stripe_subscription_id = None
    db.session.commit()


def _handle_payment_failed(invoice):
    """Handle invoice.payment_failed → downgrade to free as fallback."""
    customer_id = invoice.get("customer")
    if not customer_id:
        return
    user = User.query.filter_by(stripe_customer_id=customer_id).first()
    if not user:
        return
    current_app.logger.warning(
        "invoice.payment_failed: invoice=%s customer=%s — downgrading user %s to free",
        invoice.get("id"),
        customer_id,
        user.id,
    )
    user.plan = "free"
    db.session.commit()


def _handle_subscription_change(subscription):
    """Legacy handler kept for backwards compat — delegates to upsert/deleted."""
    if subscription.get("status") == "canceled":
        _handle_subscription_deleted(subscription)
    else:
        _handle_subscription_upsert(subscription)
