from typing import Literal

from pydantic import BaseModel

from app.core.config import SERVICE_VERSION


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["ComunidadService"] = "ComunidadService"
    version: str = SERVICE_VERSION


class DatabaseHealthResponse(HealthResponse):
    database: str
