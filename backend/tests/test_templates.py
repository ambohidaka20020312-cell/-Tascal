def test_create_template(client, auth_headers):
    res = client.post(
        "/api/v1/templates",
        json={"name": "週次レポート", "title": "週次報告書作成", "priority": "high", "estimated_minutes": 60},
        headers=auth_headers,
    )
    assert res.status_code == 201
    assert res.json["data"]["name"] == "週次レポート"


def test_list_templates(client, auth_headers):
    res = client.get("/api/v1/templates", headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.json["data"], list)


def test_delete_template(client, auth_headers):
    # create then delete
    create = client.post(
        "/api/v1/templates",
        json={"name": "test", "title": "test task", "priority": "low"},
        headers=auth_headers,
    )
    tid = create.json["data"]["id"]
    res = client.delete(f"/api/v1/templates/{tid}", headers=auth_headers)
    assert res.status_code == 200
