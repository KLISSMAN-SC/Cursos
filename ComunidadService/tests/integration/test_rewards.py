from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.models import ProcessedEvent, Reward
from app.schemas.reward import ModuleCompleted
from app.services.reward_service import EventConflict, process_module_completed


def event(**changes):
    return ModuleCompleted.model_validate(
        {
            "evento_id": str(uuid4()),
            "tipo": "ModuloCompletado",
            "estudiante_id": 7,
            "curso_id": 1,
            "version_curso": 1,
            "modulo_id": 1,
            "completado_en": datetime.now(UTC).isoformat(),
            **changes,
        }
    )


def test_reentrega_y_distinto_id_del_mismo_hito_no_duplican_premio(api):
    client, database, token = api
    message = event()
    with database.session() as session:
        first = process_module_completed(session, message)
        repeat = process_module_completed(session, message)
        another = process_module_completed(
            session, message.model_copy(update={"evento_id": uuid4()})
        )
    assert first.puntos_otorgados == 10
    assert repeat.puntos_otorgados == another.puntos_otorgados == 0
    assert first.recompensa_id == repeat.recompensa_id == another.recompensa_id
    page = client.get("/api/v1/mis-logros", headers=token()).json()
    assert page["total"] == 1 and page["puntos"] == 10
    assert "estudiante_id" not in page["items"][0]
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(ProcessedEvent)) == 2


def test_cada_modulo_y_version_tienen_su_premio_y_los_logros_son_propios(api):
    client, database, token = api
    for changes in (
        {},
        {"modulo_id": 2},
        {"version_curso": 2},
        {"estudiante_id": 8},
        {"curso_id": 2},
    ):
        with database.session() as session:
            process_module_completed(session, event(**changes))
    page = client.get("/api/v1/mis-logros?limit=2&offset=1", headers=token()).json()
    assert page["total"] == 4 and page["puntos"] == 40 and len(page["items"]) == 2
    assert client.get("/api/v1/mis-logros?curso_id=2", headers=token()).json()["puntos"] == 10
    assert client.get("/api/v1/mis-logros", headers=token(subject="8")).json()["total"] == 1
    empty = client.get("/api/v1/mis-logros", headers=token(subject="99")).json()
    assert empty["items"] == [] and empty["puntos"] == 0 and empty["total"] == 0
    assert client.get("/api/v1/mis-logros").status_code == 401
    assert client.get("/api/v1/mis-logros", headers=token("ADMIN")).status_code == 403


def test_id_reutilizado_con_datos_distintos_no_otorga_otra_recompensa(api):
    _, database, _ = api
    original = event()
    with database.session() as session:
        process_module_completed(session, original)
    with database.session() as session:
        with pytest.raises(EventConflict):
            process_module_completed(session, original.model_copy(update={"modulo_id": 9}))
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Reward)) == 1


def test_fallo_tras_flush_no_pierde_el_evento_ni_deja_puntos_parciales(api, monkeypatch):
    _, database, _ = api
    message = event()

    def fail_commit(self):
        self.flush()
        raise OperationalError("COMMIT", {}, Exception("fallo simulado"))

    with monkeypatch.context() as patch:
        patch.setattr(Session, "commit", fail_commit)
        with database.session() as session:
            with pytest.raises(OperationalError):
                process_module_completed(session, message)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Reward)) == 0
        assert session.get(ProcessedEvent, str(message.evento_id)) is None
        assert process_module_completed(session, message).puntos_otorgados == 10


@pytest.mark.parametrize(
    "changes",
    [
        {"estudiante_id": True},
        {"curso_id": "1"},
        {"version_curso": 0},
        {"modulo_id": -1},
        {"evento_id": "abc"},
        {"tipo": "CompraConfirmada"},
        {"puntos": 999},
        {"completado_en": "2026-11-14T12:00:00"},
    ],
)
def test_evento_invalido_se_rechaza(changes):
    with pytest.raises(ValidationError):
        event(**changes)
