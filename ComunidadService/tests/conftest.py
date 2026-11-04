import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.database.connection import Database
from app.main import create_app


@pytest.fixture
def settings():
    # No cargar credenciales del .env del desarrollador en las pruebas.
    return Settings(_env_file=None, db_password="")


@pytest.fixture
def client(settings):
    with TestClient(create_app(settings)) as test_client:
        yield test_client


@pytest.fixture
def database_client(settings):
    # Prueba el camino SQL real sin tocar la base de desarrollo.
    # Esta prueba no demuestra compatibilidad con un servidor PostgreSQL real.
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    database = Database(settings, engine=engine)
    with TestClient(create_app(settings, database=database)) as test_client:
        yield test_client
