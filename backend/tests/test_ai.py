import pytest
from unittest.mock import patch, MagicMock


def test_optimize_requires_auth(client):
    res = client.get("/api/v1/ai/optimize")
    assert res.status_code == 401


def test_daily_briefing_requires_auth(client):
    res = client.get("/api/v1/ai/daily-briefing")
    assert res.status_code == 401


def test_daily_briefing_returns_data(client, auth_headers):
    with patch("app.api.ai.get_llm_client") as mock_llm:
        mock_client = MagicMock()
        mock_client.chat.return_value = "今日も頑張りましょう！"
        mock_llm.return_value = mock_client
        res = client.get("/api/v1/ai/daily-briefing", headers=auth_headers)
    assert res.status_code == 200
    data = res.json["data"]
    assert "task_count" in data
    assert "message" in data


def test_stats_endpoint(client, auth_headers):
    res = client.get("/api/v1/tasks/stats", headers=auth_headers)
    assert res.status_code == 200
    data = res.json["data"]
    for key in ("weekly_completion_rate", "monthly_completion_rate", "current_streak", "total_completed"):
        assert key in data
