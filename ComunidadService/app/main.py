import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import SERVICE_NAME, SERVICE_VERSION, Settings
from app.database.connection import Database
from app.routers.health import router as health_router
from app.routers.reviews import router as reviews_router


def create_app(settings: Settings | None = None, *, database: Database | None = None) -> FastAPI:
    configuration = settings if settings is not None else Settings()
    connection = database if database is not None else Database(configuration)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        try:
            yield
        finally:
            connection.close()

    application = FastAPI(
        title=SERVICE_NAME,
        version=SERVICE_VERSION,
        description="Reseñas y moderación auditada de ComunidadService.",
        lifespan=lifespan,
    )
    application.state.settings = configuration
    application.state.database = connection
    application.add_middleware(
        CORSMiddleware,
        allow_origins=configuration.cors_origins,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=["Accept", "Content-Type", "Authorization"],
        allow_credentials=False,
    )

    @application.exception_handler(SQLAlchemyError)
    async def database_error(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        logging.getLogger(__name__).warning("Base no disponible (%s)", type(exc).__name__)
        return JSONResponse(
            status_code=503, content={"detail": "La base de datos no está disponible."}
        )

    application.include_router(health_router)
    application.include_router(reviews_router)
    return application


app = create_app()
