from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.models import Review, ReviewModeration


def publish(client, headers, course=1):
    return client.post(
        "/api/v1/resenas",
        headers=headers,
        json={"curso_id": course, "calificacion": 5, "comentario": "Inicial"},
    )


def test_una_resena_activa_por_estudiante_curso_incluso_en_base(api):
    client, database, token = api
    assert publish(client, token()).status_code == 201
    assert publish(client, token()).status_code == 409
    assert publish(client, token(), 2).status_code == 201
    assert publish(client, token(subject="8")).status_code == 201
    with database.session() as session:
        session.add(Review(curso_id=1, estudiante_id=7, calificacion=4))
        with pytest.raises(IntegrityError):
            session.commit()


def test_edicion_solo_del_autor_sin_alterar_curso_o_identidad(api):
    client, _, token = api
    review = publish(client, token()).json()
    path = f"/api/v1/resenas/{review['id']}"
    data = {"calificacion": 3, "comentario": "  Actualizado  "}
    assert client.patch(path, headers=token(subject="8"), json=data).status_code == 403
    assert client.patch(path, headers=token("ADMIN"), json=data).status_code == 403
    assert client.patch(path, headers=token(), json={**data, "curso_id": 2}).status_code == 422
    edited = client.patch(path, headers=token(), json=data)
    assert edited.status_code == 200
    assert edited.json()["comentario"] == "Actualizado"
    assert edited.json()["actualizada_en"].endswith("Z")
    page = client.get("/api/v1/resenas?curso_id=1").json()
    assert page["total"] == 1 and page["resumen"]["promedio"] == 3.0
    assert (
        client.get("/api/v1/resenas/mia?curso_id=1", headers=token()).json()["id"] == review["id"]
    )
    assert client.get("/api/v1/resenas/mia?curso_id=1", headers=token(subject="9")).json() is None


@pytest.mark.parametrize("status", [403, 503])
def test_no_publica_ni_edita_si_catalogo_deniega_o_esta_caido(api, status):
    client, database, token = api
    review = publish(client, token()).json()
    client.app.state.catalog_client.require_access.side_effect = HTTPException(status, "Sin acceso")
    assert publish(client, token(), 2).status_code == status
    assert (
        client.patch(
            f"/api/v1/resenas/{review['id']}", headers=token(), json={"calificacion": 1}
        ).status_code
        == status
    )
    client.app.state.catalog_client.require_access.assert_called_with(7, 1)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Review)) == 1
        assert session.get(Review, review["id"]).calificacion == 5


def test_oculta_no_se_edita_y_su_auditoria_permanece_al_publicar_otra(api):
    client, database, token = api
    review = publish(client, token()).json()
    assert (
        client.patch(
            f"/api/v1/resenas/{review['id']}/ocultar",
            headers=token("ADMIN", "23"),
            json={"motivo": "Contenido ofensivo"},
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/resenas/{review['id']}", headers=token(), json={"calificacion": 3}
        ).status_code
        == 409
    )
    mine = client.get("/api/v1/resenas/mia?curso_id=1", headers=token()).json()
    assert mine["oculta"] is True
    assert publish(client, token()).status_code == 201
    mine = client.get("/api/v1/resenas/mia?curso_id=1", headers=token()).json()
    assert mine["oculta"] is False
    with database.session() as session:
        audit = session.scalar(select(ReviewModeration))
        assert audit.administrador_id == 23 and audit.motivo == "Contenido ofensivo"


def test_historial_administrativo_filtrado_y_protegido(api):
    client, _, token = api
    first = publish(client, token()).json()
    publish(client, token(subject="8"), 2)
    client.patch(
        f"/api/v1/resenas/{first['id']}/ocultar",
        headers=token("ADMIN", "23"),
        json={"motivo": "Ofensivo"},
    )
    path = "/api/v1/admin/resenas"
    assert client.get(path).status_code == 401
    assert client.get(path, headers=token()).status_code == 403
    page = client.get(path + "?curso_id=1&estado=ocultas", headers=token("ADMIN")).json()
    assert page["total"] == 1
    assert page["items"][0]["moderacion"]["administrador_id"] == 23
    assert page["items"][0]["moderacion"]["moderada_en"].endswith("Z")
    assert client.get(path + "?estado=visibles", headers=token("ADMIN")).json()["total"] == 1
    public = client.get("/api/v1/resenas?curso_id=1").json()
    assert public["items"] == [] and "Ofensivo" not in str(public)


def test_fallo_de_catalogo_no_deja_transaccion_parcial(api):
    client, database, token = api
    client.app.state.catalog_client = Mock()
    client.app.state.catalog_client.require_access.side_effect = HTTPException(503, "No disponible")
    assert publish(client, token()).status_code == 503
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Review)) == 0
