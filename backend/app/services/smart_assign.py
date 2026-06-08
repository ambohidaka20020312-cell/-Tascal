"""
Smart task assignment — picks the best team member based on
current workload, skill match, and task completion rate.
"""
import json
import datetime
from flask import current_app
from ..models.task import Task
from ..models.team import TeamMember
from ..models.user import User


def _get_member_load(user_id: int, team_id: int) -> dict:
    """Calculate current workload score for a team member."""
    today = datetime.date.today()

    # Today's pending/in-progress tasks
    pending_tasks = Task.query.filter(
        Task.user_id == user_id,
        Task.assigned_to == user_id,
        Task.status.in_(["pending", "in_progress"]),
        Task.is_deleted == False,
        Task.scheduled_date == today,
    ).all()

    # Total estimated minutes remaining today
    remaining_minutes = sum(t.estimated_minutes or 30 for t in pending_tasks)

    # Completion rate (last 7 days)
    week_ago = today - datetime.timedelta(days=7)
    recent_tasks = Task.query.filter(
        Task.user_id == user_id,
        Task.scheduled_date >= week_ago,
        Task.is_deleted == False,
    ).all()
    completed = sum(1 for t in recent_tasks if t.status == "completed")
    completion_rate = (completed / len(recent_tasks)) if recent_tasks else 0.5

    return {
        "user_id": user_id,
        "pending_count": len(pending_tasks),
        "remaining_minutes": remaining_minutes,
        "completion_rate": completion_rate,
        # Lower score = more available
        "load_score": remaining_minutes + (len(pending_tasks) * 10),
    }


def _skill_match_score(user_id: int, required_skills: list) -> float:
    """Returns 0.0-1.0 skill match ratio."""
    if not required_skills:
        return 1.0
    try:
        from ..models.skill import MemberSkill
        user_skills = {
            s.skill_tag.lower()
            for s in MemberSkill.query.filter_by(user_id=user_id).all()
        }
        matched = sum(1 for s in required_skills if s.lower() in user_skills)
        return matched / len(required_skills)
    except Exception:
        return 0.5


def smart_assign(team_id: int, required_skills: list = None, exclude_user_id: int = None) -> dict:
    """
    Returns the best user_id for task assignment along with reasoning.
    """
    members = TeamMember.query.filter_by(team_id=team_id).all()
    if not members:
        return {"user_id": None, "reason": "チームメンバーが見つかりません"}

    candidates = []
    for member in members:
        if exclude_user_id and member.user_id == exclude_user_id:
            continue
        user = User.query.get(member.user_id)
        if not user:
            continue

        load = _get_member_load(member.user_id, team_id)
        skill_score = _skill_match_score(member.user_id, required_skills or [])

        # Combined score: lower load + higher skill = better candidate
        # Normalize load (assume 480min = full day), invert so higher = better
        load_normalized = max(0, 1 - (load["load_score"] / 480))
        final_score = (load_normalized * 0.6) + (skill_score * 0.4)

        candidates.append({
            "user_id": member.user_id,
            "user_name": user.name,
            "final_score": final_score,
            "pending_count": load["pending_count"],
            "remaining_minutes": load["remaining_minutes"],
            "skill_match": skill_score,
            "completion_rate": load["completion_rate"],
        })

    if not candidates:
        return {"user_id": None, "reason": "候補メンバーが見つかりません"}

    candidates.sort(key=lambda x: x["final_score"], reverse=True)
    best = candidates[0]

    reason = (
        f"{best['user_name']}さん（今日の残タスク {best['pending_count']}件・"
        f"残り約{best['remaining_minutes']}分・"
        f"スキル一致率{int(best['skill_match']*100)}%）"
    )

    return {
        "user_id": best["user_id"],
        "user_name": best["user_name"],
        "reason": reason,
        "candidates": candidates[:3],
    }
