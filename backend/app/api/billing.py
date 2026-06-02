import stripe
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User
from .. import db

bp = Blueprint("billing", __name__)


def get_stripe():
    stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]
    return stripe


@bp.post("/checkout")
@jwt_required()
def create_checkout():
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    price_map = {
        "pro": current_app.config["STRIPE_PRICE_ID_PRO"],
        "team": current_app.config["STRIPE_PRICE_ID_TEAM"],
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


def _handle_subscription_change(subscription):
    customer_id = subscription["customer"]
    user = User.query.filter_by(stripe_customer_id=customer_id).first()
    if not user:
        return
    if subscription["status"] == "active":
        # プランIDからplan名を解決（実装時にprice IDで判定）
        user.plan = "pro"
    else:
        user.plan = "free"
    db.session.commit()
