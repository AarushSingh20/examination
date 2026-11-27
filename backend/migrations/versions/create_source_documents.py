"""Register source PDFs against their exam and uploader."""

from alembic import op
import sqlalchemy as sa


revision = "create_source_documents"
down_revision = "create_notifications"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "source_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("storage_key", sa.String(512), nullable=False, unique=True),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("page_count", sa.Integer()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "status IN ('UPLOADED', 'PROCESSING', 'READY', 'FAILED')",
            name="ck_source_document_status",
        ),
        sa.CheckConstraint(
            "page_count IS NULL OR page_count > 0",
            name="ck_source_document_page_count",
        ),
    )
    op.create_index("ix_source_documents_exam_id", "source_documents", ["exam_id"])
    if op.get_context().dialect.name == "postgresql":
        op.execute("ALTER TABLE source_documents ENABLE ROW LEVEL SECURITY")


def downgrade():
    op.drop_table("source_documents")
