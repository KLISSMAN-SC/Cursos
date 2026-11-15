"""Integración optativa sobre un servidor PostgreSQL real, en esquemas efímeros."""

import os
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from threading import Barrier
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from fastapi import HTTPException
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.core.config import SERVICE_ROOT
from app.models import ProcessedEvent, Reward
from app.schemas.review import ReviewCreate
from app.schemas.reward import ModuleCompleted
from app.services.review_service import create_review, hide_review
from app.services.reward_service import process_module_completed

POSTGRES_URL = os.environ.get("COMUNIDAD_TEST_POSTGRES_URL")
pytestmark = pytest.mark.skipif(not POSTGRES_URL, reason="Sin PostgreSQL de pruebas explícito")


@pytest.fixture
def pg_engine():
    # Solo se crea/elimina un esquema aleatorio; nunca se migra el esquema del desarrollador.
    schema = "comunidad_test_" + uuid4().hex
    admin = create_engine(POSTGRES_URL)
    with admin.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(POSTGRES_URL, connect_args={"options": f"-csearch_path={schema}"})
    config = Config(str(SERVICE_ROOT / "alembic.ini"))
    try:
        with engine.begin() as connection:
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
            command.check(config)
        yield engine
    finally:
        engine.dispose()
        with admin.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        admin.dispose()


def test_postgres_carrera_resenas_y_moderacion(pg_engine):
    barrier = Barrier(4)

    def publish(_):
        with Session(pg_engine) as session:
            barrier.wait(timeout=10)
            try:
                return create_review(session, ReviewCreate(curso_id=1, calificacion=5), 7).id
            except HTTPException as error:
                assert error.status_code == 409
                return None

    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(publish, range(4)))
    ids = [identifier for identifier in results if identifier is not None]
    assert len(ids) == 1
    with Session(pg_engine) as session:
        audit = hide_review(session, ids[0], 2, "Ofensivo")
        assert audit.administrador_id == 2
        assert create_review(session, ReviewCreate(curso_id=1, calificacion=4), 7).id != ids[0]
    for statement in [
        "UPDATE moderaciones_resenas SET motivo='alterado'",
        "DELETE FROM moderaciones_resenas",
    ]:
        with pytest.raises(DBAPIError, match="inmutable"):
            with pg_engine.begin() as connection:
                connection.execute(text(statement))


def test_postgres_reentrega_concurrente_no_duplica_puntos(pg_engine):
    original = ModuleCompleted(
        evento_id=uuid4(),
        tipo="ModuloCompletado",
        estudiante_id=7,
        curso_id=1,
        version_curso=1,
        modulo_id=1,
        completado_en=datetime.now(UTC),
    )
    barrier = Barrier(4)

    def process(message):
        with Session(pg_engine, expire_on_commit=False) as session:
            barrier.wait(timeout=10)
            return process_module_completed(session, message).puntos_otorgados

    messages = [original, original, original.model_copy(update={"evento_id": uuid4()}), original]
    with ThreadPoolExecutor(max_workers=4) as executor:
        points = list(executor.map(process, messages))
    assert sum(points) == 10
    with Session(pg_engine) as session:
        assert session.scalar(select(func.count()).select_from(Reward)) == 1
        assert session.scalar(select(func.count()).select_from(ProcessedEvent)) == 2
