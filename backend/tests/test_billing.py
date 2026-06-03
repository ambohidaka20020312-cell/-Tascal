import pytest


def test_checkout_invalid_plan(client, auth_headers):
    res = client.post(
        "/api/v1/billing/checkout",
        json={"plan": "invalid", "success_url": "http://x", "cancel_url": "http://x"},
        headers=auth_headers,
    )
    assert res.status_code == 400
    assert res.json["error"]["code"] == "INVALID_PLAN"


def test_checkout_requires_auth(client):
    res = client.post("/api/v1/billing/checkout", json={})
    assert res.status_code == 401


def test_webhook_missing_signature(client):
    res = client.post("/api/v1/billing/webhook", data=b"payload")
    assert res.status_code == 400
    assert res.json["error"]["code"] == "MISSING_SIGNATURE"


def test_get_subscription(client, auth_headers):
    res = client.get("/api/v1/billing/subscription", headers=auth_headers)
    assert res.status_code == 200
    assert "plan" in res.json["data"]
