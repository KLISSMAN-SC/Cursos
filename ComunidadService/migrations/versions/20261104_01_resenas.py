"""Crear reseñas y auditoría de moderación."""

import sqlalchemy as sa
from alembic import op

revision = "20261104_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    pk_type = sa.BigInteger().with_variant(sa.Integer, "sqlite")
    op.create_table(
        "resenas",
        sa.Column("id", pk_type, primary_key=True, autoincrement=True),
        sa.Column("curso_id", sa.BigInteger, nullable=False),
        sa.Column("estudiante_id", sa.BigInteger, nullable=False),
        sa.Column("calificacion", sa.SmallInteger, nullable=False),
        sa.Column("comentario", sa.Text, nullable=True),
        sa.Column("oculta", sa.Boolean, server_default=sa.false(), nullable=False),
        sa.Column(
            "creada_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("curso_id > 0", name="ck_resenas_curso_positivo"),
        sa.CheckConstraint("estudiante_id > 0", name="ck_resenas_estudiante_positivo"),
        sa.CheckConstraint("calificacion BETWEEN 1 AND 5", name="ck_resenas_calificacion"),
        sa.CheckConstraint(
            "comentario IS NULL OR length(comentario) <= 2000", name="ck_resenas_comentario"
        ),
    )
    op.create_index("ix_resenas_curso_visible", "resenas", ["curso_id", "oculta", "id"])
    op.create_table(
        "moderaciones_resenas",
        sa.Column("id", pk_type, primary_key=True, autoincrement=True),
        sa.Column(
            "resena_id", pk_type, sa.ForeignKey("resenas.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("administrador_id", sa.BigInteger, nullable=False),
        sa.Column("motivo", sa.String(1000), nullable=False),
        sa.Column(
            "moderada_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("resena_id", name="uq_moderaciones_resena"),
        sa.CheckConstraint("administrador_id > 0", name="ck_moderaciones_admin_positivo"),
        sa.CheckConstraint(
            "length(trim(motivo)) BETWEEN 1 AND 1000", name="ck_moderaciones_motivo"
        ),
    )


def downgrade() -> None:
    op.drop_table("moderaciones_resenas")
    op.drop_index("ix_resenas_curso_visible", table_name="resenas")
    op.drop_table("resenas")
