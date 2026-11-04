from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    false,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base

identifier = BigInteger().with_variant(Integer, "sqlite")


class Review(Base):
    __tablename__ = "resenas"
    __table_args__ = (
        CheckConstraint("curso_id > 0", name="ck_resenas_curso_positivo"),
        CheckConstraint("estudiante_id > 0", name="ck_resenas_estudiante_positivo"),
        CheckConstraint("calificacion BETWEEN 1 AND 5", name="ck_resenas_calificacion"),
        CheckConstraint(
            "comentario IS NULL OR length(comentario) <= 2000", name="ck_resenas_comentario"
        ),
        Index("ix_resenas_curso_visible", "curso_id", "oculta", "id"),
    )
    id: Mapped[int] = mapped_column(identifier, primary_key=True, autoincrement=True)
    curso_id: Mapped[int] = mapped_column(BigInteger)
    estudiante_id: Mapped[int] = mapped_column(BigInteger)
    calificacion: Mapped[int] = mapped_column(SmallInteger)
    comentario: Mapped[str | None] = mapped_column(Text, nullable=True)
    oculta: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    creada_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ReviewModeration(Base):
    __tablename__ = "moderaciones_resenas"
    __table_args__ = (
        UniqueConstraint("resena_id", name="uq_moderaciones_resena"),
        CheckConstraint("administrador_id > 0", name="ck_moderaciones_admin_positivo"),
        CheckConstraint("length(trim(motivo)) BETWEEN 1 AND 1000", name="ck_moderaciones_motivo"),
    )
    id: Mapped[int] = mapped_column(identifier, primary_key=True, autoincrement=True)
    resena_id: Mapped[int] = mapped_column(ForeignKey("resenas.id", ondelete="RESTRICT"))
    administrador_id: Mapped[int] = mapped_column(BigInteger)
    motivo: Mapped[str] = mapped_column(String(1000))
    moderada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
