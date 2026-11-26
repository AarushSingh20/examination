"""Create persistent notifications for recipients in the examination portal."""

from alembic import op
import sqlalchemy as sa


revision = "create_notifications"
down_revision = "create_exam_invitations"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recipient_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("kind", sa.String(48), nullable=False),
        sa.Column("invitation_id", sa.Integer(), sa.ForeignKey("exam_invitations.id")),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint(
            "recipient_id", "invitation_id", "kind", name="uq_notification_invite_event"
        ),
    )
    op.create_index(
        "ix_notifications_recipient_created", "notifications", ["recipient_id", "created_at"]
    )
    if op.get_context().dialect.name == "postgresql":
        op.execute("ALTER TABLE notifications ENABLE ROW LEVEL SECURITY")


def downgrade():
    op.drop_table("notifications")
