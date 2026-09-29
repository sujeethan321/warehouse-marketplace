"""Allow admin in the existing MySQL users.role ENUM without replacing any rows.

Revision ID: 0001_admin_role
Revises: None (the initial schema is installed using schema.sql)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = "0001_admin_role"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    column = next(c for c in sa.inspect(bind).get_columns("users") if c["name"] == "role")
    if bind.dialect.name == "mysql" and isinstance(column["type"], mysql.ENUM):
        values = column["type"].enums
        if "admin" not in values:
            op.alter_column("users", "role", existing_type=column["type"],
                            type_=mysql.ENUM(*values, "admin"),
                            existing_nullable=column["nullable"], existing_server_default=column["default"])
    # SQLAlchemy-created development schemas use VARCHAR(20), which already accepts admin.


def downgrade():
    # Removing an ENUM value could silently corrupt accounts on permissive MySQL.
    raise RuntimeError("Admin role migration is forward-only; preserve existing accounts.")
