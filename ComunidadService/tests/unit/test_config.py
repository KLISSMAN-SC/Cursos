from pydantic import SecretStr

from app.core.config import Settings


def test_url_conserva_caracteres_especiales_sin_exponer_la_clave():
    password = "clave@con:/# espacios"
    settings = Settings(_env_file=None, db_password=SecretStr(password))
    url = settings.database_url()
    assert url.drivername == "postgresql+psycopg"
    assert url.password == password
    assert password not in str(url)
    assert password not in repr(settings)


def test_variables_de_entorno_tienen_prefijo(monkeypatch):
    monkeypatch.setenv("COMUNIDAD_DB_NAME", "base_prueba")
    monkeypatch.setenv("COMUNIDAD_DB_PORT", "5544")
    settings = Settings(_env_file=None)
    assert settings.db_name == "base_prueba"
    assert settings.db_port == 5544
