"""
Input validation helpers for Tascal API.
"""
import re
from typing import Any


def sanitize_string(s: str, max_length: int = 500) -> str:
    """Strip control characters and limit length."""
    if not isinstance(s, str):
        return str(s)[:max_length]
    # Remove null bytes and control characters (except \n \t)
    cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', s)
    return cleaned[:max_length]


def validate_email(email: str) -> bool:
    """Basic email validation."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email)) and len(email) <= 254

ALLOWED_PRIORITIES = {"low", "medium", "high", "urgent"}
ALLOWED_STATUSES = {"pending", "in_progress", "completed", "overdue"}
ALLOWED_RECURRENCES = {"none", "daily", "weekly", "monthly", "weekdays"}

MAX_TITLE_LENGTH = 255
MAX_DESCRIPTION_LENGTH = 5000
MIN_ESTIMATED_MINUTES = 1
MAX_ESTIMATED_MINUTES = 1440  # 24 hours

PASSWORD_MIN_LENGTH = 8
PASSWORD_PATTERN = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).+$")


def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password strength.
    Returns (is_valid, error_message).
    """
    if len(password) < PASSWORD_MIN_LENGTH:
        return False, f"パスワードは{PASSWORD_MIN_LENGTH}文字以上である必要があります"
    if not PASSWORD_PATTERN.match(password):
        return False, "パスワードは英字と数字を両方含む必要があります"
    return True, ""


def validate_task_fields(data: dict[str, Any]) -> tuple[bool, str]:
    """
    Validate task create/update payload.
    Returns (is_valid, error_message).
    """
    title = data.get("title")
    if title is not None:
        if not isinstance(title, str) or not title.strip():
            return False, "タイトルは必須です"
        if len(title) > MAX_TITLE_LENGTH:
            return False, f"タイトルは{MAX_TITLE_LENGTH}文字以内にしてください"

    description = data.get("description")
    if description is not None and len(str(description)) > MAX_DESCRIPTION_LENGTH:
        return False, f"説明は{MAX_DESCRIPTION_LENGTH}文字以内にしてください"

    estimated_minutes = data.get("estimated_minutes")
    if estimated_minutes is not None:
        try:
            val = int(estimated_minutes)
        except (TypeError, ValueError):
            return False, "estimated_minutes は整数で指定してください"
        if not (MIN_ESTIMATED_MINUTES <= val <= MAX_ESTIMATED_MINUTES):
            return False, f"estimated_minutes は{MIN_ESTIMATED_MINUTES}〜{MAX_ESTIMATED_MINUTES}の範囲で指定してください"

    priority = data.get("priority")
    if priority is not None and priority not in ALLOWED_PRIORITIES:
        return False, f"priority は {', '.join(sorted(ALLOWED_PRIORITIES))} のいずれかにしてください"

    status = data.get("status")
    if status is not None and status not in ALLOWED_STATUSES:
        return False, f"status は {', '.join(sorted(ALLOWED_STATUSES))} のいずれかにしてください"

    recurrence = data.get("recurrence")
    if recurrence is not None and recurrence not in ALLOWED_RECURRENCES:
        return False, f"recurrence は {', '.join(sorted(ALLOWED_RECURRENCES))} のいずれかにしてください"

    return True, ""
