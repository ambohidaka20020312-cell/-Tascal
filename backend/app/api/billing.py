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
        "name": "Team",
        "price": 1480,
        "price_label": "¥1,480",
        "price_note": "/ 人 / 月",
        "category": "business",
        "features": [
            "個人Pro全機能",
            "グループチャット・DM",
            "部署・メンバー管理",
            "管理者ダッシュボード",
            "チャット→タスク変換",
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

    pro_price = current_app.config.get("STRIPE_PRICE_ID_PRO") or current_app.config.get("STRIPE_PRICE_ID_PERSONAL_PRO")
    team_price = current_app.config.get("STRIPE_PRICE_ID_TEAM") or current_app.config.get("STRIPE_PRICE_ID_BUSINESS")
    price_map = {
        "pro": pro_price,
        "personal_pro": pro_price,
        "team": team_price,
        "business": team_price,
        "enterprise": current_app.config.get("STRIPE_PRICE_ID_ENTERPRISE") or team_price,
    }
    price_id = price_map.get(data["plan"])
    if not price_id:
        return jsonify({"error": {"code": "INVALID_PLAN", "message": "無効なプランです"}}), 400

    plan = data["plan"]
    is_pro = plan in ("pro", "personal_pro")
    use_trial = is_pro and not user.trial_used

    s = get_stripe()
    session_params = dict(
        customer_email=user.email,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        payment_method_collection="always",
        success_url=data["success_url"],
        cancel_url=data["cancel_url"],
        metadata={"user_id": user_id},
    )
    if use_trial:
        session_params["subscription_data"] = {"trial_period_days": 14}
        user.trial_used = True
        db.session.commit()

    session = s.checkout.Session.create(**session_params)
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
    return jsonify({"data": {
        "plan": user.plan,
        "stripe_customer_id": user.stripe_customer_id,
        "trial_used": user.trial_used,
        "trial_active": user.is_trial_active,
    }})


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


# ─── Apple IAP / RevenueCat sync ──────────────────────────────────────────────

VALID_IAP_PLANS = {"free", "personal_pro", "pro", "team", "business", "enterprise"}


@bp.post("/iap-sync")
@jwt_required()
def iap_sync():
    """
    Called by the frontend after a successful RevenueCat purchase or restore.
    Updates the user's plan based on active entitlements reported by RevenueCat.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = request.get_json(silent=True) or {}

    plan = data.get("plan", "free")
    if plan not in VALID_IAP_PLANS:
        return jsonify({"error": {"code": "INVALID_PLAN", "message": "無効なプランです"}}), 400

    rc_user_id = data.get("original_app_user_id", "")

    user.plan = plan
    if rc_user_id:
        user.revenuecat_user_id = rc_user_id
    db.session.commit()

    current_app.logger.info(
        "IAP sync: user=%s plan=%s rc_user=%s", user_id, plan, rc_user_id
    )
    return jsonify({"data": {"plan": user.plan}, "message": "プランを更新しました"})


@bp.post("/revenuecat-webhook")
def revenuecat_webhook():
    """
    RevenueCat server-to-server webhook.
    Configure in RevenueCat dashboard → Project → Webhooks.
    Set Authorization header to REVENUECAT_WEBHOOK_SECRET.
    """
    auth = request.headers.get("Authorization", "")
    secret = current_app.config.get("REVENUECAT_WEBHOOK_SECRET", "")
    if secret and auth != secret:
        return jsonify({"error": "Unauthorized"}), 401

    event = request.get_json(silent=True) or {}
    event_type = event.get("event", {}).get("type", "")
    app_user_id = event.get("event", {}).get("app_user_id", "")
    aliases = event.get("event", {}).get("aliases", [])

    # Find user by RevenueCat ID or alias
    user = None
    for uid in [app_user_id] + aliases:
        user = User.query.filter_by(revenuecat_user_id=uid).first()
        if not user:
            try:
                user = User.query.get(int(uid))
            except (ValueError, TypeError):
                pass
        if user:
            break

    if not user:
        current_app.logger.warning("RevenueCat webhook: user not found for %s", app_user_id)
        return jsonify({"received": True})

    entitlements = event.get("event", {}).get("entitlement_ids", [])

    if event_type in ("INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"):
        if "team" in entitlements or "business" in entitlements:
            user.plan = "team"
        elif entitlements:
            user.plan = "personal_pro"
        db.session.commit()
    elif event_type in ("CANCELLATION", "EXPIRATION", "BILLING_ISSUE"):
        user.plan = "free"
        db.session.commit()

    current_app.logger.info(
        "RevenueCat webhook: type=%s user=%s plan=%s", event_type, user.id, user.plan
    )
    return jsonify({"received": True})
