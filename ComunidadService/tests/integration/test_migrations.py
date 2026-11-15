import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from app.core.config import SERVICE_ROOT


def test_migracion_sube_y_revierte_tablas_en_base_aislada():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    config = Config(str(SERVICE_ROOT / "alembic.ini"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
        tables = inspect(connection).get_table_names()
        assert {"resenas", "moderaciones_resenas"}.issubset(tables)
        command.check(config)
        command.downgrade(config, "base")
        assert "resenas" not in inspect(connection).get_table_names()
    engine.dispose()


def test_actualizar_desde_resenas_conserva_datos_y_auditoria():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    config = Config(str(SERVICE_ROOT / "alembic.ini"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "20261104_01")
        connection.execute(
            text("INSERT INTO resenas (curso_id, estudiante_id, calificacion) VALUES (1,7,5)")
        )
        command.upgrade(config, "head")
        assert connection.scalar(text("SELECT calificacion FROM resenas WHERE id=1")) == 5
        assert connection.scalar(text("SELECT count(*) FROM recompensas")) == 0
        command.check(config)
    engine.dispose()


def test_duplicados_historicos_bloquean_migracion_sin_ocultar_o_borrar():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    config = Config(str(SERVICE_ROOT / "alembic.ini"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "20261104_01")
        connection.execute(
            text(
                "INSERT INTO resenas (curso_id, estudiante_id, calificacion) VALUES (1,7,5),(1,7,4)"
            )
        )
        with pytest.raises(RuntimeError, match="activas duplicadas"):
            command.upgrade(config, "head")
        assert connection.scalar(text("SELECT count(*) FROM resenas WHERE oculta=false")) == 2
        assert "actualizada_en" not in [
            c["name"] for c in inspect(connection).get_columns("resenas")
        ]
    engine.dispose()
