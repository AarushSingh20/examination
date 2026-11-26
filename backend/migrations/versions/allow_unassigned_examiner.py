"""Allow drafts in the existing examination database to have no examiner."""

from alembic import op
import sqlalchemy as sa


revision = "allow_unassigned_examiner"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "exams",
        "examiner_id",
        schema="public",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade():
    # PostgreSQL rejects SET NOT NULL if any unassigned drafts still exist.
    op.alter_column(
        "exams",
        "examiner_id",
        schema="public",
        existing_type=sa.Integer(),
        nullable=False,
    )
