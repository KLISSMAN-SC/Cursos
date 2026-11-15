from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator

from app.schemas.review import PositiveId


class ModuleCompleted(BaseModel):
    model_config = ConfigDict(extra="forbid")
    evento_id: UUID
    tipo: Literal["ModuloCompletado"]
    estudiante_id: PositiveId
    curso_id: PositiveId
    version_curso: PositiveId
    modulo_id: PositiveId
    completado_en: AwareDatetime

    @field_validator("completado_en")
    @classmethod
    def normalize_timestamp(cls, value: datetime) -> datetime:
        return value.astimezone(UTC)


class RewardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    curso_id: int
    version_curso: int
    modulo_id: int
    regla: str
    insignia: str
    puntos: int
    obtenida_en: datetime

    @field_validator("obtenida_en")
    @classmethod
    def utc_date(cls, value: datetime) -> datetime:
        return value if value.tzinfo else value.replace(tzinfo=UTC)


class RewardPage(BaseModel):
    items: list[RewardRead]
    total: int
    puntos: int
    limit: int
    offset: int


class EventResult(BaseModel):
    evento_id: str
    recompensa_id: int
    premio_otorgado: bool
    puntos_otorgados: int = Field(ge=0, le=10)
