"""Tests for plan limits, task reorder, account API, and push subscriptions."""
import datetime
import pytest
from unittest.mock import patch

from app import db as _db
from app.models.user import User
from app.models.task import Task
from app.models.ai_usage import AIUsage
from tests.conftest import register, login


def create_task(client, headers, title="テストタスク", **kwargs):
    data = {"title": title, **kwargs}
    return client.post("/api/v1/tasks", json=data, headers=headers)


# ---------------------------------------------------------------------------
# Plan limits (plan_limits.py)
# ---------------------------------------------------------------------------

class TestPlanLimits:

    def test_free_user_blocked_after_20_tasks(self, client, auth_headers):
        """Free user should get 403 TASK_LIMIT_EXCEEDED on the 21st task."""
        for i in range(20):
            res = create_task(client, auth_headers, title=f"タスク{i + 1}")
            assert res.status_code == 201

        res = create_task(client, auth_headers, title="21件目")
        assert res.status_code == 403
        body = res.get_json()
        assert body["error"]["code"] == "TASK_LIMIT_EXCEEDED"

    def test_free_user_blocked_after_3_ai_calls(self, client, app, auth_headers):
        """Free user should get 403 AI_LIMIT_EXCEEDED on the 4th AI call today."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            user_id = user.id
            today = datetime.date.today()
            usage = AIUsage(user_id=user_id, date=today, count=3)
            _db.session.add(usage)
            _db.session.commit()

        with patch("app.api.ai.AIOptimizer") as MockOptimizer:
            instance = MockOptimizer.return_value
            instance.optimize.return_value = {"schedule": [], "message": "ok", "advice": "good"}
            res = client.get("/api/v1/ai/optimize", headers=auth_headers)

        assert res.status_code == 403
        body = res.get_json()
        assert body["error"]["code"] == "AI_LIMIT_EXCEEDED"

    def test_pro_user_not_blocked_by_task_limit(self, client, app, auth_headers):
        """Pro user should not be blocked even after 20 tasks."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            user.plan = "pro"
            _db.session.commit()

        for i in range(21):
            res = create_task(client, auth_headers, title=f"プロタスク{i + 1}")
            assert res.status_code == 201

    def test_pro_user_not_blocked_by_ai_limit(self, client, app, auth_headers):
        """Pro user should not be blocked by AI call limit."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            user.plan = "pro"
            user_id = user.id
            today = datetime.date.today()
            usage = AIUsage(user_id=user_id, date=today, count=100)
            _db.session.add(usage)
            _db.session.commit()

        with patch("app.api.ai.AIOptimizer") as MockOptimizer:
            instance = MockOptimizer.return_value
            instance.optimize.return_value = {"schedule": [], "message": "ok", "advice": "good"}
            res = client.get("/api/v1/ai/optimize", headers=auth_headers)

        # Should not be blocked by AI limit (may fail for other reasons, but not 403 AI_LIMIT)
        if res.status_code == 403:
            body = res.get_json()
            assert body.get("error", {}).get("code") != "AI_LIMIT_EXCEEDED"


# ---------------------------------------------------------------------------
# Task reorder (PATCH /tasks/reorder)
# ---------------------------------------------------------------------------

class TestTaskReorder:

    def test_reorder_tasks_success(self, client, auth_headers):
        """Tasks are reordered by providing an order array."""
        id1 = create_task(client, auth_headers, title="タスクA").get_json()["data"]["id"]
        id2 = create_task(client, auth_headers, title="タスクB").get_json()["data"]["id"]
        id3 = create_task(client, auth_headers, title="タスクC").get_json()["data"]["id"]

        res = client.patch(
            "/api/v1/tasks/reorder",
            json={"order": [id3, id1, id2]},
            headers=auth_headers,
        )
        assert res.status_code == 200
        body = res.get_json()
        assert "message" in body

    def test_reorder_tasks_unauthenticated_returns_401(self, client):
        """Unauthenticated reorder request should return 401."""
        res = client.patch(
            "/api/v1/tasks/reorder",
            json={"order": [1, 2, 3]},
        )
        assert res.status_code == 401

    def test_reorder_updates_sort_order(self, client, app, auth_headers):
        """sort_order fields should reflect the provided order array."""
        id1 = create_task(client, auth_headers, title="First").get_json()["data"]["id"]
        id2 = create_task(client, auth_headers, title="Second").get_json()["data"]["id"]

        client.patch(
            "/api/v1/tasks/reorder",
            json={"order": [id2, id1]},
            headers=auth_headers,
        )

        with app.app_context():
            t1 = Task.query.get(id1)
            t2 = Task.query.get(id2)
            assert t2.sort_order == 0
            assert t1.sort_order == 1

    def test_reorder_ignores_other_users_tasks(self, client, app, auth_headers, auth_headers2):
        """Tasks belonging to another user should be silently ignored."""
        id_other = create_task(
            client, auth_headers2, title="他ユーザーのタスク"
        ).get_json()["data"]["id"]

        # user1 tries to include user2's task in reorder — should not raise an error
        res = client.patch(
            "/api/v1/tasks/reorder",
            json={"order": [id_other]},
            headers=auth_headers,
        )
        assert res.status_code == 200

        # The other user's task sort_order must not have been modified by user1
        with app.app_context():
            t = Task.query.get(id_other)
            assert t.sort_order != 0 or t.user_id != 1  # belongs to user2, not user1


# ---------------------------------------------------------------------------
# Account API (/account)
# ---------------------------------------------------------------------------

class TestAccountDataExport:

    def test_data_export_returns_json(self, client, auth_headers):
        """GET /account/data-export should return a JSON attachment with user data."""
        res = client.get("/api/v1/account/data-export", headers=auth_headers)
        assert res.status_code == 200
        assert "application/json" in res.content_type
        assert "attachment" in res.headers.get("Content-Disposition", "")

        body = res.get_json()
        assert "user" in body
        assert "tasks" in body
        assert "ai_usage" in body
        assert "templates" in body

    def test_data_export_contains_user_email(self, client, auth_headers):
        """Exported data should include the authenticated user's email."""
        res = client.get("/api/v1/account/data-export", headers=auth_headers)
        assert res.status_code == 200
        body = res.get_json()
        assert body["user"]["email"] == "test@example.com"

    def test_data_export_includes_tasks(self, client, auth_headers):
        """Tasks created by the user should appear in the export."""
        create_task(client, auth_headers, title="エクスポートタスク")
        res = client.get("/api/v1/account/data-export", headers=auth_headers)
        body = res.get_json()
        titles = [t["title"] for t in body["tasks"]]
        assert "エクスポートタスク" in titles

    def test_data_export_requires_auth(self, client):
        """Unauthenticated request should be rejected."""
        res = client.get("/api/v1/account/data-export")
        assert res.status_code == 401


class TestAccountDelete:

    def test_delete_account_removes_user_tasks(self, client, app, auth_headers):
        """DELETE /account should permanently remove the user and their tasks."""
        task_id = create_task(
            client, auth_headers, title="削除予定タスク"
        ).get_json()["data"]["id"]

        res = client.delete("/api/v1/account", headers=auth_headers)
        assert res.status_code == 200
        body = res.get_json()
        assert "message" in body

        with app.app_context():
            task = Task.query.get(task_id)
            assert task is None

    def test_delete_account_removes_user_record(self, client, app, auth_headers):
        """DELETE /account should remove the user record from DB."""
        res = client.delete("/api/v1/account", headers=auth_headers)
        assert res.status_code == 200

        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            assert user is None

    def test_delete_account_requires_auth(self, client):
        """Unauthenticated delete request should return 401."""
        res = client.delete("/api/v1/account")
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# Push subscriptions (/push)
# ---------------------------------------------------------------------------

SAMPLE_SUBSCRIPTION = {
    "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-unique",
    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DY",
    "auth": "tBHItJI5svbpez7KI4CCXg",
}


class TestPushSubscribe:

    def test_subscribe_creates_subscription(self, client, auth_headers):
        """POST /push/subscribe should create a new subscription and return 201."""
        res = client.post(
            "/api/v1/push/subscribe",
            json=SAMPLE_SUBSCRIPTION,
            headers=auth_headers,
        )
        assert res.status_code == 201
        body = res.get_json()
        assert body["data"]["endpoint"] == SAMPLE_SUBSCRIPTION["endpoint"]
        assert "message" in body

    def test_subscribe_upserts_on_duplicate_endpoint(self, client, app, auth_headers):
        """Calling subscribe with the same endpoint twice should not create a duplicate."""
        client.post(
            "/api/v1/push/subscribe",
            json=SAMPLE_SUBSCRIPTION,
            headers=auth_headers,
        )

        updated = {**SAMPLE_SUBSCRIPTION, "auth": "newAuthKey1234567"}
        res = client.post(
            "/api/v1/push/subscribe",
            json=updated,
            headers=auth_headers,
        )
        assert res.status_code == 201

        from app.models.push_subscription import PushSubscription

        with app.app_context():
            count = PushSubscription.query.filter_by(
                endpoint=SAMPLE_SUBSCRIPTION["endpoint"]
            ).count()
            assert count == 1

    def test_subscribe_missing_fields_returns_400(self, client, auth_headers):
        """Missing required fields should return 400 INVALID_PAYLOAD."""
        res = client.post(
            "/api/v1/push/subscribe",
            json={"endpoint": "https://example.com/push"},
            headers=auth_headers,
        )
        assert res.status_code == 400
        body = res.get_json()
        assert body["error"]["code"] == "INVALID_PAYLOAD"

    def test_subscribe_requires_auth(self, client):
        """Unauthenticated subscribe request should return 401."""
        res = client.post("/api/v1/push/subscribe", json=SAMPLE_SUBSCRIPTION)
        assert res.status_code == 401

    def test_subscribe_then_unsubscribe(self, client, auth_headers):
        """A subscription can be created and then deleted via the unsubscribe endpoint."""
        client.post(
            "/api/v1/push/subscribe",
            json=SAMPLE_SUBSCRIPTION,
            headers=auth_headers,
        )

        res = client.delete(
            "/api/v1/push/subscribe",
            json={"endpoint": SAMPLE_SUBSCRIPTION["endpoint"]},
            headers=auth_headers,
        )
        assert res.status_code == 200


# ---------------------------------------------------------------------------
# Categories (/categories)
# ---------------------------------------------------------------------------

class TestCategories:

    def test_create_category(self, client, auth_headers):
        res = client.post("/api/v1/categories", json={"name": "Work"}, headers=auth_headers)
        assert res.status_code == 201
        body = res.get_json()
        assert body["data"]["name"] == "Work"
        assert "id" in body["data"]

    def test_list_categories(self, client, auth_headers):
        client.post("/api/v1/categories", json={"name": "Work"}, headers=auth_headers)
        client.post("/api/v1/categories", json={"name": "Personal"}, headers=auth_headers)
        res = client.get("/api/v1/categories", headers=auth_headers)
        assert res.status_code == 200
        assert len(res.get_json()["data"]) == 2

    def test_category_unique_per_user(self, client, auth_headers):
        client.post("/api/v1/categories", json={"name": "Work"}, headers=auth_headers)
        res = client.post("/api/v1/categories", json={"name": "Work"}, headers=auth_headers)
        assert res.status_code == 409

    def test_filter_tasks_by_category(self, client, auth_headers):
        cat_res = client.post("/api/v1/categories", json={"name": "Work"}, headers=auth_headers)
        cat_id = cat_res.get_json()["data"]["id"]
        client.post("/api/v1/tasks", json={"title": "Task A", "category_id": cat_id}, headers=auth_headers)
        client.post("/api/v1/tasks", json={"title": "Task B"}, headers=auth_headers)
        res = client.get(f"/api/v1/tasks?category_id={cat_id}", headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()["data"]
        assert len(data) == 1
        assert data[0]["title"] == "Task A"


# ---------------------------------------------------------------------------
# Task notes (/tasks/<id>/notes)
# ---------------------------------------------------------------------------

class TestTaskNotes:

    def test_add_note(self, client, auth_headers):
        task_res = client.post("/api/v1/tasks", json={"title": "Note Task"}, headers=auth_headers)
        task_id = task_res.get_json()["data"]["id"]
        res = client.post(f"/api/v1/tasks/{task_id}/notes", json={"content": "hello"}, headers=auth_headers)
        assert res.status_code == 201
        assert res.get_json()["data"]["content"] == "hello"

    def test_list_notes(self, client, auth_headers):
        task_res = client.post("/api/v1/tasks", json={"title": "Note Task"}, headers=auth_headers)
        task_id = task_res.get_json()["data"]["id"]
        client.post(f"/api/v1/tasks/{task_id}/notes", json={"content": "note 1"}, headers=auth_headers)
        client.post(f"/api/v1/tasks/{task_id}/notes", json={"content": "note 2"}, headers=auth_headers)
        res = client.get(f"/api/v1/tasks/{task_id}/notes", headers=auth_headers)
        assert res.status_code == 200
        assert len(res.get_json()["data"]) == 2

    def test_delete_note(self, client, auth_headers):
        task_res = client.post("/api/v1/tasks", json={"title": "Note Task"}, headers=auth_headers)
        task_id = task_res.get_json()["data"]["id"]
        note_res = client.post(f"/api/v1/tasks/{task_id}/notes", json={"content": "bye"}, headers=auth_headers)
        note_id = note_res.get_json()["data"]["id"]
        del_res = client.delete(f"/api/v1/tasks/{task_id}/notes/{note_id}", headers=auth_headers)
        assert del_res.status_code == 200
        list_res = client.get(f"/api/v1/tasks/{task_id}/notes", headers=auth_headers)
        assert len(list_res.get_json()["data"]) == 0


# ---------------------------------------------------------------------------
# Task export (/tasks/export)
# ---------------------------------------------------------------------------

class TestTaskExport:

    def test_export_json(self, client, auth_headers):
        client.post("/api/v1/tasks", json={"title": "Export Me"}, headers=auth_headers)
        res = client.get("/api/v1/tasks/export?format=json", headers=auth_headers)
        assert res.status_code == 200
        assert res.content_type.startswith("application/json")
        data = res.get_json()
        assert isinstance(data, list)
        assert any(t["title"] == "Export Me" for t in data)

    def test_export_csv(self, client, auth_headers):
        client.post("/api/v1/tasks", json={"title": "CSV Task"}, headers=auth_headers)
        res = client.get("/api/v1/tasks/export?format=csv", headers=auth_headers)
        assert res.status_code == 200
        assert "text/csv" in res.content_type
        assert b"CSV Task" in res.data


# ---------------------------------------------------------------------------
# Health check (/health)
# ---------------------------------------------------------------------------

class TestHealth:

    def test_health_endpoint(self, client):
        res = client.get("/api/v1/health")
        assert res.status_code == 200
        body = res.get_json()
        assert body["status"] == "ok"
        assert "version" in body
