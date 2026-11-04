from unittest.mock import Mock

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.main import create_app


def test_liveness_no_depende_de_la_base(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ComunidadService", "version": "0.1.0"}


def test_raiz_responde_con_el_nombre_correcto(client):
    assert client.get("/").json()["service"] == "ComunidadService"


def test_readiness_sin_configuracion_no_simula_una_conexion(client):
    response = client.get("/health/db")
    assert response.status_code == 503
    assert "Configura" in response.json()["detail"]


def test_readiness_ejecuta_sql_con_motor_inyectado(database_client):
    response = database_client.get("/health/db")
    assert response.status_code == 200
    assert response.json()["database"] == ":memory:"


def test_error_de_conexion_no_filtra_credenciales(settings, caplog):
    sensitive = "postgresql://usuario:clave_confidencial@servidor/base"
    database = Mock()
    database.ping.side_effect = OperationalError("SELECT 1", {}, Exception(sensitive))
    with TestClient(create_app(settings, database=database)) as client:
        response = client.get("/health/db")
    assert response.status_code == 503
    assert "clave_confidencial" not in response.text
    assert "clave_confidencial" not in caplog.text
    database.close.assert_called_once()


def test_swagger_expone_ambas_comprobaciones(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    assert {"/health", "/health/db"}.issubset(paths)
    assert client.get("/docs").status_code == 200


def test_cors_acepta_el_front_local(client):
    response = client.get("/health", headers={"Origin": "http://localhost:4200"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:4200"


def test_cors_no_habilita_origenes_desconocidos(client):
    response = client.get("/health", headers={"Origin": "https://desconocido.test"})
    assert "access-control-allow-origin" not in response.headers
