import io
import json
from contextlib import contextmanager
from urllib.error import HTTPError, URLError

import pytest
from fastapi import HTTPException
from pydantic import SecretStr

from app.clients.catalogo import CatalogClient


@pytest.mark.parametrize(
    "state,expected",
    [
        ("ACTIVO", None),
        ("PENDIENTE", 403),
        ("REVOCADO", 403),
        ("INEXISTENTE", 403),
        ("OTRO", 503),
    ],
)
def test_catalogo_valida_estado_e_identidad(settings, monkeypatch, state, expected):
    settings.catalogo_base_url = "https://catalogo.test"
    settings.catalogo_service_token = SecretStr("secreto-de-prueba")

    @contextmanager
    def response(request, timeout):
        assert request.full_url.endswith("/api/v1/derechos?estudiante_id=7&curso_id=1")
        assert request.get_header("Authorization") == "Bearer secreto-de-prueba"
        stream = io.BytesIO(
            json.dumps({"estudiante_id": 7, "curso_id": 1, "estado": state}).encode()
        )
        stream.status = 200
        yield stream

    monkeypatch.setattr("app.clients.catalogo.urlopen", response)
    client = CatalogClient(settings)
    if expected:
        with pytest.raises(HTTPException) as error:
            client.require_access(7, 1)
        assert error.value.status_code == expected
    else:
        client.require_access(7, 1)


@pytest.mark.parametrize(
    "body",
    [
        b'{"estudiante_id": 8, "curso_id": 1, "estado":"ACTIVO"}',
        b'{"estudiante_id": 7, "curso_id": 2, "estado":"ACTIVO"}',
        b'{"activo":true}',
        b'{"estudiante_id":"7", "curso_id":1,"estado":"ACTIVO"}',
        b"no-json",
    ],
)
def test_respuesta_ajena_o_invalida_falla_cerrada(settings, monkeypatch, body):
    settings.catalogo_base_url = "https://catalogo.test"
    settings.catalogo_service_token = SecretStr("secreto")

    @contextmanager
    def response(*args, **kwargs):
        stream = io.BytesIO(body)
        stream.status = 200
        yield stream

    monkeypatch.setattr("app.clients.catalogo.urlopen", response)
    with pytest.raises(HTTPException) as error:
        CatalogClient(settings).require_access(7, 1)
    assert error.value.status_code == 503


@pytest.mark.parametrize(
    "failure,expected",
    [
        (URLError("secreto-no-filtrar"), 503),
        (TimeoutError("secreto-no-filtrar"), 503),
        (HTTPError("url", 404, "no", {}, None), 403),
        (HTTPError("url", 401, "secreto-no-filtrar", {}, None), 503),
    ],
)
def test_timeout_y_errores_no_otorgan_acceso_ni_filtran_datos(
    settings, monkeypatch, failure, expected
):
    settings.catalogo_base_url = "https://catalogo.test"
    settings.catalogo_service_token = SecretStr("secreto")

    def fail(*args, **kwargs):
        raise failure

    monkeypatch.setattr("app.clients.catalogo.urlopen", fail)
    with pytest.raises(HTTPException) as error:
        CatalogClient(settings).require_access(7, 1)
    assert error.value.status_code == expected
    assert "secreto" not in str(error.value.detail)


def test_sin_configuracion_no_asume_compra(settings):
    with pytest.raises(HTTPException) as error:
        CatalogClient(settings).require_access(7, 1)
    assert error.value.status_code == 503
