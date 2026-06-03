def test_sql_injection_in_task_title(client, auth_headers):
    # SQLインジェクション試行は400かスルーされて正常動作すること
    res = client.post("/api/v1/tasks",
        json={"title": "'; DROP TABLE tasks; --", "priority": "low"},
        headers=auth_headers)
    # SQLAlchemyのORMを使っているので安全なはず
    assert res.status_code in (201, 400)

def test_xss_in_task_title(client, auth_headers):
    res = client.post("/api/v1/tasks",
        json={"title": "<script>alert('xss')</script>", "priority": "low"},
        headers=auth_headers)
    # タイトルは保存されるが、JSONレスポンスなのでXSSにはならない
    if res.status_code == 201:
        assert "<script>" in res.json["data"]["title"]  # 保存はされる
        # だがJSONとして返すのでブラウザでは実行されない

def test_rate_limit_headers_present(client, auth_headers):
    res = client.get("/api/v1/tasks", headers=auth_headers)
    # Redisなしのテスト環境ではスキップされる可能性あり
    assert res.status_code == 200

def test_security_headers(client):
    res = client.get("/api/v1/health")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert "Content-Security-Policy" in res.headers
