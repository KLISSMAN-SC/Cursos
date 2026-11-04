from datetime import UTC, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.security import MAX_ID

PositiveId = Annotated[int, Field(strict=True, gt=0, le=MAX_ID)]


class ReviewCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    curso_id: PositiveId
    calificacion: int = Field(strict=True, ge=1, le=5)
    comentario: str | None = Field(default=None, max_length=2000)

    @field_validator("comentario")
    @classmethod
    def blank_to_none(cls, value: str | None) -> str | None:
        return value or None


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    curso_id: int
    estudiante_id: int
    calificacion: int
    comentario: str | None
    creada_en: datetime

    @field_validator("creada_en")
    @classmethod
    def utc_date(cls, value: datetime) -> datetime:
        return value if value.tzinfo else value.replace(tzinfo=UTC)


class ReviewSummary(BaseModel):
    total: int
    promedio: float | None
    distribucion: dict[str, int]


class ReviewPage(BaseModel):
    items: list[ReviewRead]
    total: int
    limit: int
    offset: int
    resumen: ReviewSummary


class ReviewHide(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    motivo: str = Field(min_length=1, max_length=1000)


class ModerationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    resena_id: int
    administrador_id: int
    motivo: str
    moderada_en: datetime
