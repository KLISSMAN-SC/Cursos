import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError

from app.database.connection import Database, DatabaseNotConfigured
from app.database.dependencies import get_database
from app.schemas.health import DatabaseHealthResponse, HealthResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Estado"])


@router.get("/", response_model=HealthResponse, include_in_schema=False)
@router.get("/health", response_model=HealthResponse, summary="Estado de ComunidadService")
def health() -> HealthResponse:
    # El proceso puede responder aunque la base no esté disponible.
    return HealthResponse()


@router.get(
    "/health/db",
    response_model=DatabaseHealthResponse,
    summary="Comprobar conexión real a la base de datos",
    responses={503: {"description": "Base sin configurar o no disponible"}},
)
def database_health(
    database: Annotated[Database, Depends(get_database)],
) -> DatabaseHealthResponse:
    try:
        return DatabaseHealthResponse(database=database.ping())
    except DatabaseNotConfigured as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Configura la base de datos de ComunidadService en el archivo .env.",
        ) from exc
    except SQLAlchemyError as exc:
        # No registrar str(exc): puede contener el usuario, la URL o la contraseña.
        logger.warning("ComunidadService: base no disponible (%s)", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La base de datos de ComunidadService no está disponible.",
        ) from exc
