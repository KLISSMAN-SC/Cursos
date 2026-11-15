from datetime import UTC, datetime, timedelta
from unittest.mock import Mock

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.database.base import Base
from app.database.connection import Database
from app.main import create_app
from app.models import Review, Reward  # noqa: F401


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


@pytest.fixture(scope="session")
def keys(tmp_path_factory):
    directory = tmp_path_factory.mktemp("jwt")
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    path = directory / "public.pem"
    path.write_bytes(
        private.public_key().public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
        )
    )
    return private, path


@pytest.fixture
def api(settings, keys):
    private, public_path = keys
    settings.jwt_public_key_file = str(public_path)
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    database = Database(settings, engine=engine)

    def token(role="ESTUDIANTE", subject="7", **changes):
        claims = {
            "sub": subject,
            "rol": role,
            "iss": settings.jwt_issuer,
            "aud": settings.jwt_audience,
            "exp": datetime.now(UTC) + timedelta(minutes=5),
        }
        claims.update(changes)
        return {"Authorization": "Bearer " + jwt.encode(claims, private, algorithm="RS256")}

    application = create_app(settings, database=database)
    application.state.catalog_client = Mock()
    with TestClient(application) as client:
        yield client, database, token
