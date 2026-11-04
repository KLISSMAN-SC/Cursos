from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

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
