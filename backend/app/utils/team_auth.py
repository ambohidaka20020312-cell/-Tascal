from flask import jsonify
from ..models.team import TeamMember, Team


def require_team_seat(user, team_id):
    """Return None if the user has a seat in the team, or a 403 JSON response otherwise."""
    member = TeamMember.query.filter_by(team_id=team_id, user_id=user.id).first()
    if not member:
        return jsonify({
            "error": {
                "code": "TEAM_SEAT_REQUIRED",
                "message": "このチームのメンバーではありません",
            }
        }), 403
    return None


def get_user_team(user):
    """Return the first Team the user belongs to, or None."""
    membership = TeamMember.query.filter_by(user_id=user.id).first()
    if not membership:
        return None
    return Team.query.get(membership.team_id)
