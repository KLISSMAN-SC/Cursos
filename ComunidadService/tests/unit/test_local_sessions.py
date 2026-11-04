import json

import jwt
import pytest

from scripts.preparar_pruebas_jwt import prepare


def test_sesiones_locales_firmadas_no_exponen_la_clave_privada(tmp_path, settings):
    destination = prepare(tmp_path, settings=settings)
    public_path = tmp_path / "config/jwt/usuarios-public.pem"
    private_path = tmp_path / ".local-auth/pruebas-private.pem"
    assert private_path.is_file()
    sessions = json.loads(destination.read_text())
    for label, expected in [("estudiante", "ESTUDIANTE"), ("administrador", "ADMIN")]:
        claims = jwt.decode(
            sessions[label],
            public_path.read_bytes(),
            algorithms=["RS256"],
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
        )
        assert claims["rol"] == expected and int(claims["sub"]) > 0
    assert not (tmp_path / "config/jwt/pruebas-private.pem").exists()
    original_key = public_path.read_bytes()
    prepare(tmp_path, settings=settings)
    assert public_path.read_bytes() == original_key


def test_herramienta_no_reemplaza_una_clave_publica_existente(tmp_path, settings):
    public_path = tmp_path / "config/jwt/usuarios-public.pem"
    public_path.parent.mkdir(parents=True)
    public_path.write_text("clave-del-emisor-real")
    with pytest.raises(RuntimeError):
        prepare(tmp_path, settings=settings)
    assert public_path.read_text() == "clave-del-emisor-real"
