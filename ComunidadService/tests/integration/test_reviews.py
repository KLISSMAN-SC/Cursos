from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.database.connection import Database
from app.main import create_app
from app.models import Review, ReviewModeration


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

    with TestClient(create_app(settings, database=database)) as client:
        yield client, database, token


def publish(client, headers, rating=5, course=1, comment="Buen curso"):
    return client.post(
        "/api/v1/resenas",
        headers=headers,
        json={"curso_id": course, "calificacion": rating, "comentario": comment},
    )


def test_listado_publico_paginado_y_resumen_aislado_por_curso(api):
    client, _, token = api
    for rating in (1, 5, 3):
        assert publish(client, token(), rating).status_code == 201
    publish(client, token(), 1, course=2)
    response = client.get("/api/v1/resenas?curso_id=1&limit=2&offset=1")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert [r["calificacion"] for r in data["items"]] == [5, 1]
    assert data["resumen"]["promedio"] == 3.0
    assert data["resumen"]["distribucion"] == {"1": 1, "2": 0, "3": 1, "4": 0, "5": 1}


def test_curso_sin_resenas_no_inventa_calificacion(api):
    client, _, _ = api
    data = client.get("/api/v1/resenas?curso_id=1").json()
    assert data["items"] == [] and data["total"] == 0
    assert data["resumen"]["promedio"] is None


def test_identidad_se_obtiene_del_jwt_y_no_de_un_header_editable(api):
    client, _, token = api
    headers = {**token(subject="17"), "X-Student-Id": "999"}
    response = publish(client, headers, comment="  Buen contenido  ")
    assert response.status_code == 201
    assert response.json()["estudiante_id"] == 17
    assert response.json()["comentario"] == "Buen contenido"
    assert response.json()["creada_en"].endswith("Z")
    assert "oculta" not in response.json()
    assert publish(client, {"X-Student-Id": "17"}).status_code == 401


@pytest.mark.parametrize("value", [0, 6, 1.5, True, "5"])
def test_calificacion_requiere_entero_entre_uno_y_cinco(api, value):
    client, _, token = api
    assert publish(client, token(), value).status_code == 422


@pytest.mark.parametrize("value", [0, -1, 1.5, True, "1"])
def test_ids_json_son_enteros_positivos(api, value):
    client, _, token = api
    assert publish(client, token(), course=value).status_code == 422


def test_no_se_puede_inyectar_el_estudiante_en_el_cuerpo(api):
    client, _, token = api
    response = client.post(
        "/api/v1/resenas",
        headers=token(),
        json={"curso_id": 1, "calificacion": 5, "estudiante_id": 99},
    )
    assert response.status_code == 422


def test_comentario_opcional_y_limite(api):
    client, _, token = api
    assert publish(client, token(), comment="  ").json()["comentario"] is None
    assert publish(client, token(), comment="a" * 2001).status_code == 422


def test_admin_no_publica_y_alumno_no_modera(api):
    client, _, token = api
    assert publish(client, token("ADMIN")).status_code == 403
    review = publish(client, token()).json()
    response = client.patch(
        f"/api/v1/resenas/{review['id']}/ocultar",
        headers=token(),
        json={"motivo": "Contenido ofensivo"},
    )
    assert response.status_code == 403


def test_ocultar_requiere_motivo_y_actualiza_listado_resumen_y_auditoria(api):
    client, database, token = api
    first = publish(client, token(), 1).json()
    publish(client, token(), 5)
    path = f"/api/v1/resenas/{first['id']}/ocultar"
    assert client.patch(path, headers=token("ADMIN"), json={"motivo": "  "}).status_code == 422
    response = client.patch(path, headers=token("ADMIN", "23"), json={"motivo": "  Ofensivo  "})
    assert response.status_code == 200
    assert response.json()["administrador_id"] == 23
    assert response.json()["motivo"] == "Ofensivo"
    data = client.get("/api/v1/resenas?curso_id=1").json()
    assert data["total"] == 1 and data["resumen"]["promedio"] == 5.0
    assert all(r["id"] != first["id"] for r in data["items"])
    assert client.patch(path, headers=token("ADMIN"), json={"motivo": "Otro"}).status_code == 409
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(ReviewModeration)) == 1
        assert session.get(Review, first["id"]).oculta is True


def test_ocultar_inexistente_devuelve_404(api):
    client, _, token = api
    assert (
        client.patch(
            "/api/v1/resenas/999/ocultar", headers=token("ADMIN"), json={"motivo": "Motivo"}
        ).status_code
        == 404
    )


def test_fallo_en_auditoria_revierte_ocultamiento(api, monkeypatch):
    client, database, token = api
    review = publish(client, token()).json()

    def fail_commit(self):
        raise OperationalError("INSERT", {}, Exception("clave-no-se-debe-filtrar"))

    with monkeypatch.context() as m:
        m.setattr(Session, "commit", fail_commit)
        response = client.patch(
            f"/api/v1/resenas/{review['id']}/ocultar",
            headers=token("ADMIN"),
            json={"motivo": "Motivo"},
        )
    assert response.status_code == 503
    assert "clave-no-se-debe-filtrar" not in response.text
    with database.session() as session:
        assert session.get(Review, review["id"]).oculta is False
        assert session.scalar(select(func.count()).select_from(ReviewModeration)) == 0


@pytest.mark.parametrize(
    "changes",
    [
        {"exp": datetime.now(UTC) - timedelta(hours=1)},
        {"iss": "otro-emisor"},
        {"aud": "otro-servicio"},
        {"rol": "SUPERADMIN"},
        {"sub": "0"},
        {"sub": "abc"},
    ],
)
def test_jwt_invalido_o_sin_permiso_no_se_acepta(api, changes):
    client, _, token = api
    assert client.get("/api/v1/sesion", headers=token(**changes)).status_code == 401


def test_no_acepta_algoritmo_diferente_ni_tokens_alterados(api):
    client, _, token = api
    unsigned = jwt.encode({"sub": "1", "rol": "ADMIN"}, "clave-sin-relacion" * 3, algorithm="HS256")
    assert (
        client.get("/api/v1/sesion", headers={"Authorization": "Bearer " + unsigned}).status_code
        == 401
    )
    valid = token()["Authorization"]
    pieces = valid.split(".")
    pieces[1] = pieces[1][:-2] + "XX"
    assert (
        client.get("/api/v1/sesion", headers={"Authorization": ".".join(pieces)}).status_code == 401
    )


def test_paginacion_invalida(api):
    client, _, _ = api
    for query in ["curso_id=0", "curso_id=1&limit=101", "curso_id=1&offset=-1"]:
        assert client.get("/api/v1/resenas?" + query).status_code == 422
