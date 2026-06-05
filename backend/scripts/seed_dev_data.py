#!/usr/bin/env python3
"""Seed development database with test data."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app, db
from app.models.user import User
from app.models.task import Task
from app.models.category import Category
from datetime import date, timedelta


def seed():
    app = create_app("development")
    with app.app_context():
        # Check if already seeded
        if User.query.filter_by(email="demo@tascal.app").first():
            print("Already seeded")
            return

        # Create demo user
        user = User(email="demo@tascal.app", name="Demo User", plan="pro")
        user.set_password("demo1234")
        user.onboarding_completed = True
        db.session.add(user)
        db.session.flush()

        # Create categories
        cats = []
        for name in ["仕事", "個人", "学習"]:
            c = Category(user_id=user.id, name=name)
            db.session.add(c)
            cats.append(c)
        db.session.flush()

        # Create tasks
        today = date.today()
        tasks_data = [
            {"title": "週次レポート作成", "priority": "high", "estimated_minutes": 60, "category_id": cats[0].id},
            {"title": "チームミーティング", "priority": "urgent", "estimated_minutes": 30, "category_id": cats[0].id, "scheduled_date": today.isoformat()},
            {"title": "React ドキュメント読む", "priority": "medium", "estimated_minutes": 45, "category_id": cats[2].id},
            {"title": "運動", "priority": "low", "estimated_minutes": 30, "category_id": cats[1].id, "scheduled_date": today.isoformat()},
            {"title": "期限切れタスク", "priority": "high", "scheduled_date": (today - timedelta(days=2)).isoformat()},
        ]
        for td in tasks_data:
            t = Task(user_id=user.id, **td)
            db.session.add(t)

        db.session.commit()
        print("Seeded: demo@tascal.app / demo1234")


if __name__ == "__main__":
    seed()
