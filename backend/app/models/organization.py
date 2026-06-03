from .. import db
import datetime


class Organization(db.Model):
    __tablename__ = "organizations"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(100), nullable=False, unique=True, index=True)
    plan = db.Column(db.String(20), default="business")  # business / enterprise
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    max_members = db.Column(db.Integer, default=50)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    departments = db.relationship("Department", backref="organization", lazy="dynamic", cascade="all, delete-orphan")
    members = db.relationship("OrganizationMember", backref="organization", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "plan": self.plan,
            "owner_id": self.owner_id,
            "max_members": self.max_members,
            "created_at": self.created_at.isoformat(),
        }


class Department(db.Model):
    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    org_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "org_id": self.org_id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
        }


class OrganizationMember(db.Model):
    __tablename__ = "organization_members"

    id = db.Column(db.Integer, primary_key=True)
    org_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    role = db.Column(db.String(20), default="member")  # owner / admin / member
    joined_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "org_id": self.org_id,
            "user_id": self.user_id,
            "department_id": self.department_id,
            "role": self.role,
            "joined_at": self.joined_at.isoformat(),
        }
