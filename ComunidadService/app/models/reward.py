from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.review import identifier


class ProcessedEvent(Base):
    __tablename__ = "eventos_procesados"
    evento_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    huella: Mapped[str] = mapped_column(String(64))
    procesado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Reward(Base):
    __tablename__ = "recompensas"
    __table_args__ = (
        UniqueConstraint(
            "estudiante_id",
            "curso_id",
            "version_curso",
            "modulo_id",
            "regla",
            name="uq_recompensa_hito",
        ),
        CheckConstraint(
            "estudiante_id > 0 AND curso_id > 0 AND version_curso > 0 AND modulo_id > 0",
            name="ck_recompensas_ids_positivos",
        ),
        CheckConstraint("puntos = 10", name="ck_recompensas_diez_puntos"),
        Index("ix_recompensas_estudiante", "estudiante_id", "id"),
    )
    id: Mapped[int] = mapped_column(identifier, primary_key=True, autoincrement=True)
    estudiante_id: Mapped[int] = mapped_column(BigInteger)
    curso_id: Mapped[int] = mapped_column(BigInteger)
    version_curso: Mapped[int] = mapped_column(BigInteger)
    modulo_id: Mapped[int] = mapped_column(BigInteger)
    regla: Mapped[str] = mapped_column(String(64))
    insignia: Mapped[str] = mapped_column(String(120))
    puntos: Mapped[int]
    obtenida_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
