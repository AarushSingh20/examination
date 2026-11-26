"""Store proposed examiner assignments and their responses."""
from alembic import op
import sqlalchemy as sa

revision = "create_exam_invitations"
down_revision = "allow_unassigned_examiner"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "exam_invitations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("examiner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("invited_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("starts_at", sa.DateTime(), nullable=False),
        sa.Column("ends_at", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("responded_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint("ends_at > starts_at", name="ck_exam_invitation_window"),
        sa.CheckConstraint(
            "status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED')",
            name="ck_exam_invitation_status",
        ),
    )
    op.create_index("ix_exam_invitations_examiner_id", "exam_invitations", ["examiner_id"])
    op.create_index(
        "uq_exam_invitation_pending",
        "exam_invitations",
        ["exam_id", "examiner_id"],
        unique=True,
        postgresql_where=sa.text("status = 'PENDING'"),
        sqlite_where=sa.text("status = 'PENDING'"),
    )
    op.create_index(
        "uq_exam_invitation_accepted",
        "exam_invitations",
        ["exam_id"],
        unique=True,
        postgresql_where=sa.text("status = 'ACCEPTED'"),
        sqlite_where=sa.text("status = 'ACCEPTED'"),
    )
    # Flask owns access to invitations. Direct Supabase client roles have no policy.
    if op.get_context().dialect.name == "postgresql":
        op.execute("ALTER TABLE exam_invitations ENABLE ROW LEVEL SECURITY")


def downgrade():
    op.drop_table("exam_invitations")
