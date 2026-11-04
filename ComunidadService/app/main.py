from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import SERVICE_NAME, SERVICE_VERSION, Settings
from app.database.connection import Database
from app.routers.health import router as health_router


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
        description="API de comunidad: base inicial de conexión y estado del servicio.",
        lifespan=lifespan,
    )
    application.state.settings = configuration
    application.state.database = connection
    application.add_middleware(
        CORSMiddleware,
        allow_origins=configuration.cors_origins,
        allow_methods=["GET"],
        allow_headers=["Accept", "Content-Type"],
        allow_credentials=False,
    )
    application.include_router(health_router)
    return application


app = create_app()
