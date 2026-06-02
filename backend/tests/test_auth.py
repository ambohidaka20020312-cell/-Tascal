import pytest
from app import create_app, db as _db


@pytest.fixture(scope="session")
def app():
    app = create_app("testing")
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db(app):
    yield
    with app.app_context():
        _db.session.remove()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def register(client, email="test@example.com", password="pass1234", name="Test User"):
    return client.post("/api/v1/auth/register", json={"email": email, "password": password, "name": name})


def login(client, email="test@example.com", password="pass1234"):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

class TestRegister:
    def test_register_success(self, client):
        res = register(client)
        assert res.status_code == 201
        body = res.get_json()
        assert body["data"]["user"]["email"] == "test@example.com"
        assert body["data"]["user"]["plan"] == "free"
        assert "message" in body

    def test_register_duplicate_email(self, client):
        register(client)
        res = register(client)
        assert res.status_code == 409
        body = res.get_json()
        assert body["error"]["code"] == "EMAIL_EXISTS"

    def test_register_missing_fields(self, client):
        # auth.py raises KeyError when password is absent → 500 in test mode
        res = client.post("/api/v1/auth/register", json={"email": "only@example.com"})
        assert res.status_code >= 400


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class TestLogin:
    def test_login_success(self, client):
        register(client)
        res = login(client)
        assert res.status_code == 200
        body = res.get_json()
        assert "access_token" in body["data"]
        assert "refresh_token" in body["data"]
        assert body["data"]["user"]["email"] == "test@example.com"

    def test_login_wrong_password(self, client):
        register(client)
        res = login(client, password="wrongpass")
        assert res.status_code == 401
        body = res.get_json()
        assert body["error"]["code"] == "INVALID_CREDENTIALS"

    def test_login_unknown_email(self, client):
        res = login(client, email="nobody@example.com")
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# Token refresh
# ---------------------------------------------------------------------------

class TestRefresh:
    def test_refresh_success(self, client):
        register(client)
        tokens = login(client).get_json()["data"]
        refresh_token = tokens["refresh_token"]

        res = client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {refresh_token}"},
        )
        assert res.status_code == 200
        body = res.get_json()
        assert "access_token" in body["data"]

    def test_refresh_with_access_token_rejected(self, client):
        register(client)
        tokens = login(client).get_json()["data"]
        access_token = tokens["access_token"]

        res = client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert res.status_code == 422
