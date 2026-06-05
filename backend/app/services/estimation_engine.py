"""
学習型見積もり補正エンジン
Analyzes a user's task completion history to learn personal time estimation patterns.
Returns correction ratios and average times by category/priority to guide future estimates.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from ..models.task import Task


MIN_SAMPLES = 3  # require at least this many completed tasks before giving advice


def get_user_estimation_patterns(user_id: int) -> dict[str, Any]:
    """
    Returns estimation patterns for a user based on completed tasks where
    both estimated_minutes and actual_minutes are recorded.
    """
    tasks = (
        Task.query.filter_by(user_id=user_id, status="completed", is_deleted=False)
        .filter(Task.estimated_minutes.isnot(None), Task.actual_minutes.isnot(None))
        .all()
    )

    if not tasks:
        return {"has_data": False, "overall": None, "by_category": {}, "by_priority": {}}

    # Overall ratio: actual / estimated. >1 means user underestimates.
    ratios = [t.actual_minutes / t.estimated_minutes for t in tasks if t.estimated_minutes > 0]

    overall = None
    if len(ratios) >= MIN_SAMPLES:
        avg_ratio = sum(ratios) / len(ratios)
        overall = {
            "ratio": round(avg_ratio, 2),
            "sample_count": len(ratios),
            "tendency": _tendency_label(avg_ratio),
        }

    # By category
    by_category: dict[int, list[float]] = defaultdict(list)
    for t in tasks:
        if t.estimated_minutes and t.estimated_minutes > 0 and t.category_id:
            by_category[t.category_id].append(t.actual_minutes / t.estimated_minutes)

    by_category_result: dict[str, Any] = {}
    for cat_id, cat_ratios in by_category.items():
        if len(cat_ratios) >= MIN_SAMPLES:
            avg = sum(cat_ratios) / len(cat_ratios)
            by_category_result[str(cat_id)] = {
                "ratio": round(avg, 2),
                "sample_count": len(cat_ratios),
                "tendency": _tendency_label(avg),
            }

    # By priority
    by_priority: dict[str, list[float]] = defaultdict(list)
    for t in tasks:
        if t.estimated_minutes and t.estimated_minutes > 0:
            by_priority[t.priority].append(t.actual_minutes / t.estimated_minutes)

    by_priority_result: dict[str, Any] = {}
    for prio, prio_ratios in by_priority.items():
        if len(prio_ratios) >= MIN_SAMPLES:
            avg = sum(prio_ratios) / len(prio_ratios)
            by_priority_result[prio] = {
                "ratio": round(avg, 2),
                "sample_count": len(prio_ratios),
                "tendency": _tendency_label(avg),
            }

    return {
        "has_data": overall is not None or bool(by_category_result) or bool(by_priority_result),
        "overall": overall,
        "by_category": by_category_result,
        "by_priority": by_priority_result,
    }


def suggest_minutes(estimated: int, patterns: dict[str, Any], category_id: int | None, priority: str) -> dict[str, Any]:
    """
    Given a user's input estimate and their patterns, return a suggested adjusted value.
    Prefers category-specific ratio over priority-specific over overall.
    """
    ratio = None
    source = None

    cat_key = str(category_id) if category_id else None
    if cat_key and cat_key in patterns.get("by_category", {}):
        ratio = patterns["by_category"][cat_key]["ratio"]
        source = "category"
    elif priority in patterns.get("by_priority", {}):
        ratio = patterns["by_priority"][priority]["ratio"]
        source = "priority"
    elif patterns.get("overall"):
        ratio = patterns["overall"]["ratio"]
        source = "overall"

    if ratio is None or estimated <= 0:
        return {"suggested": None, "ratio": None, "source": None}

    suggested = round(estimated * ratio)
    return {"suggested": suggested, "ratio": ratio, "source": source}


def _tendency_label(ratio: float) -> str:
    if ratio >= 1.3:
        return "underestimate"  # 実際にかかる時間を過小評価しがち
    if ratio <= 0.8:
        return "overestimate"   # 余裕を持ちすぎる傾向
    return "accurate"
