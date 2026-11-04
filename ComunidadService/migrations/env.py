from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import Settings
from app.database.base import Base
from app.models import Review, ReviewModeration  # noqa: F401

target_metadata = Base.metadata


def configured_url():
    settings = Settings()
    if not settings.db_password.get_secret_value():
        raise RuntimeError("Configura COMUNIDAD_DB_PASSWORD antes de ejecutar Alembic")
    return settings.database_url(), settings.db_connect_timeout


def run_with_connection(connection):
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_offline():
    url, _ = configured_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    supplied_connection = context.config.attributes.get("connection")
    if supplied_connection is not None:
        run_with_connection(supplied_connection)
        return
    url, timeout = configured_url()
    engine = create_engine(url, poolclass=pool.NullPool, connect_args={"connect_timeout": timeout})
    try:
        with engine.connect() as connection:
            run_with_connection(connection)
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
