"""Reseña activa única, edición e idempotencia de recompensas."""

import sqlalchemy as sa
from alembic import op

revision = "20261114_02"
down_revision = "20261104_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # No ocultar ni borrar reseñas históricas atribuyendo una acción a un admin ficticio.
    connection = op.get_bind()
    duplicates = connection.execute(
        sa.text(
            "SELECT estudiante_id, curso_id FROM resenas WHERE oculta = false "
            "GROUP BY estudiante_id, curso_id HAVING COUNT(*) > 1 LIMIT 1"
        )
    ).first()
    if duplicates:
        raise RuntimeError(
            "Existen reseñas activas duplicadas. Un administrador debe ocultar las sobrantes "
            "con motivo antes de migrar. Ver docs/COMUNIDAD_COMPLETA.md. No se borraron datos."
        )
    op.add_column("resenas", sa.Column("actualizada_en", sa.DateTime(timezone=True), nullable=True))
    op.create_index(
        "uq_resenas_activa_estudiante_curso",
        "resenas",
        ["estudiante_id", "curso_id"],
        unique=True,
        postgresql_where=sa.column("oculta").is_(False),
        sqlite_where=sa.column("oculta").is_(False),
    )
    pk_type = sa.BigInteger().with_variant(sa.Integer, "sqlite")
    op.create_table(
        "eventos_procesados",
        sa.Column("evento_id", sa.String(36), primary_key=True),
        sa.Column("huella", sa.String(64), nullable=False),
        sa.Column(
            "procesado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_table(
        "recompensas",
        sa.Column("id", pk_type, primary_key=True, autoincrement=True),
        sa.Column("estudiante_id", sa.BigInteger, nullable=False),
        sa.Column("curso_id", sa.BigInteger, nullable=False),
        sa.Column("version_curso", sa.BigInteger, nullable=False),
        sa.Column("modulo_id", sa.BigInteger, nullable=False),
        sa.Column("regla", sa.String(64), nullable=False),
        sa.Column("insignia", sa.String(120), nullable=False),
        sa.Column("puntos", sa.Integer, nullable=False),
        sa.Column("obtenida_en", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "estudiante_id",
            "curso_id",
            "version_curso",
            "modulo_id",
            "regla",
            name="uq_recompensa_hito",
        ),
        sa.CheckConstraint(
            "estudiante_id > 0 AND curso_id > 0 AND version_curso > 0 AND modulo_id > 0",
            name="ck_recompensas_ids_positivos",
        ),
        sa.CheckConstraint("puntos = 10", name="ck_recompensas_diez_puntos"),
    )
    op.create_index("ix_recompensas_estudiante", "recompensas", ["estudiante_id", "id"])
    if connection.dialect.name == "postgresql":
        op.execute("""
            CREATE FUNCTION comunidad_auditoria_inmutable() RETURNS trigger
            LANGUAGE plpgsql AS $$ BEGIN
                RAISE EXCEPTION 'La auditoria de moderacion es inmutable';
            END $$
        """)
        op.execute("""
            CREATE TRIGGER moderaciones_inmutables BEFORE UPDATE OR DELETE
            ON moderaciones_resenas FOR EACH ROW
            EXECUTE FUNCTION comunidad_auditoria_inmutable()
        """)


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TRIGGER moderaciones_inmutables ON moderaciones_resenas")
        op.execute("DROP FUNCTION comunidad_auditoria_inmutable()")
    op.drop_index("ix_recompensas_estudiante", table_name="recompensas")
    op.drop_table("recompensas")
    op.drop_table("eventos_procesados")
    op.drop_index("uq_resenas_activa_estudiante_curso", table_name="resenas")
    with op.batch_alter_table("resenas") as batch:
        batch.drop_column("actualizada_en")
