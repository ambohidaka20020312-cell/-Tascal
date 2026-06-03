import os
import json
import anthropic
from ..models.task import Task
from ..models.organization import Organization, Department, OrganizationMember
from ..models.member_skill import MemberSkill


PRIORITY_WEIGHT = {"urgent": 4, "high": 3, "medium": 2, "low": 1}


class OrgAIOptimizer:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        return self._client

    def distribute_tasks(self, org_id: int, tasks: list, members: list, departments: list) -> dict:
        """
        タスクリストを各メンバー・部署に最適配分。
        - メンバーのスキルタグとタスクのrequired_skillsでスキルスコアを計算
        - メンバーの現在のタスク負荷（逆数スコア）
        - 最終スコア = スキルスコア * 0.6 + 負荷スコア(逆数) * 0.4
        Claude APIで自然言語による配分理由も生成
        """
        # Build load map: user_id -> (active task count, estimated minutes sum)
        load_map: dict[int, dict] = {}
        for m in members:
            uid = m["user_id"]
            active_tasks = Task.query.filter_by(
                org_id=org_id,
                assigned_to=uid,
                is_deleted=False,
            ).filter(Task.status.in_(["pending", "in_progress"])).all()
            count = len(active_tasks)
            est_minutes = sum((t.estimated_minutes or 0) for t in active_tasks)
            load_map[uid] = {"count": count, "est_minutes": est_minutes}

        # Build skill map: user_id -> {skill_tag: level}
        skill_map: dict[int, dict[str, int]] = {}
        for m in members:
            uid = m["user_id"]
            skills = MemberSkill.query.filter_by(user_id=uid).all()
            skill_map[uid] = {s.skill_tag: s.level for s in skills}

        dept_map = {d["id"]: d for d in departments}
        member_dept_map: dict[int, int | None] = {m["user_id"]: m.get("department_id") for m in members}

        # Compute max load for normalisation
        max_load = max((v["count"] * max(v["est_minutes"], 1) for v in load_map.values()), default=1) or 1

        assignments: list[dict] = []
        for task in tasks:
            # Parse required_skills JSON list
            required_skills: list[str] = []
            raw_skills = task.get("required_skills")
            if raw_skills:
                try:
                    required_skills = json.loads(raw_skills) if isinstance(raw_skills, str) else raw_skills
                except (ValueError, TypeError):
                    required_skills = []

            best_member = None
            best_score = -1.0
            for m in members:
                uid = m["user_id"]

                # --- Skill score (0.0 – 1.0 normalised) ---
                if required_skills:
                    member_skills = skill_map.get(uid, {})
                    skill_score_raw = sum(
                        member_skills.get(tag, 0) for tag in required_skills
                    )
                    max_possible = len(required_skills) * 5  # max level = 5
                    skill_score = skill_score_raw / max_possible if max_possible > 0 else 0.0
                else:
                    # No required skills: fall back to department keyword match
                    skill_score = 0.0
                    dept_id = member_dept_map.get(uid)
                    if dept_id and dept_id in dept_map:
                        dept_desc = dept_map[dept_id].get("description", "").lower()
                        task_text = (task.get("title", "") + " " + task.get("description", "")).lower()
                        common = sum(1 for word in dept_desc.split() if len(word) > 3 and word in task_text)
                        skill_score = min(common / 5.0, 1.0)  # cap at 1.0

                # --- Load score (inverse, 0.0 – 1.0) ---
                load = load_map.get(uid, {})
                load_value = load.get("count", 0) * max(load.get("est_minutes", 1), 1)
                load_score = 1.0 - (load_value / max_load)
                load_score = max(0.0, load_score)

                # --- Final score ---
                final_score = skill_score * 0.6 + load_score * 0.4

                if final_score > best_score:
                    best_score = final_score
                    best_member = m

            assignments.append({
                "task_id": task["id"],
                "task_title": task["title"],
                "assigned_to": best_member["user_id"] if best_member else None,
                "department_id": member_dept_map.get(best_member["user_id"]) if best_member else None,
                "score": round(best_score, 4),
            })
            if best_member:
                uid = best_member["user_id"]
                load_map[uid]["count"] += 1
                load_map[uid]["est_minutes"] += task.get("estimated_minutes") or 0

        # Generate AI explanation
        ai_message = self._generate_distribution_message(tasks, assignments, members, departments)

        return {"assignments": assignments, "ai_message": ai_message}

    def _generate_distribution_message(self, tasks, assignments, members, departments) -> str:
        prompt = (
            "あなたは組織のタスク管理AIアシスタントです。\n"
            "以下のタスク配分結果に基づき、日本語で簡潔な配分理由と推奨事項を生成してください。\n\n"
            f"タスク数: {len(tasks)}\n"
            f"メンバー数: {len(members)}\n"
            f"部署数: {len(departments)}\n"
            f"配分結果: {json.dumps(assignments, ensure_ascii=False)}\n"
        )
        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except Exception as e:
            return f"AI分析を生成できませんでした: {str(e)}"

    def analyze_org_productivity(self, org_id: int) -> dict:
        """
        組織全体の生産性分析
        - 部署別完了率
        - ボトルネック検出
        - 改善提案
        """
        from .. import db
        from sqlalchemy import func

        departments = Department.query.filter_by(org_id=org_id).all()
        dept_stats = []
        bottlenecks = []

        for dept in departments:
            total = Task.query.filter_by(org_id=org_id, department_id=dept.id, is_deleted=False).count()
            completed = Task.query.filter_by(
                org_id=org_id, department_id=dept.id, status="completed", is_deleted=False
            ).count()
            overrun = Task.query.filter_by(
                org_id=org_id, department_id=dept.id, status="overrun", is_deleted=False
            ).count()

            completion_rate = (completed / total * 100) if total > 0 else 0
            stat = {
                "department_id": dept.id,
                "department_name": dept.name,
                "total_tasks": total,
                "completed_tasks": completed,
                "overrun_tasks": overrun,
                "completion_rate": round(completion_rate, 1),
            }
            dept_stats.append(stat)

            if completion_rate < 50 and total >= 3:
                bottlenecks.append(dept.name)

        # AI improvement suggestions
        suggestions = self._generate_productivity_suggestions(dept_stats, bottlenecks)

        return {
            "department_stats": dept_stats,
            "bottlenecks": bottlenecks,
            "suggestions": suggestions,
        }

    def _generate_productivity_suggestions(self, dept_stats: list, bottlenecks: list) -> str:
        prompt = (
            "あなたは組織の生産性改善アドバイザーです。\n"
            "以下の部署別タスク統計を分析し、日本語で改善提案を3点以内で提示してください。\n\n"
            f"統計データ: {json.dumps(dept_stats, ensure_ascii=False)}\n"
            f"ボトルネック部署: {bottlenecks}\n"
        )
        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except Exception as e:
            return f"AI提案を生成できませんでした: {str(e)}"
