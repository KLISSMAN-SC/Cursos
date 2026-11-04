from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import Settings
from app.database.base import Base

# Importar aquí los modelos al implementar la primera tabla.
target_metadata = Base.metadata
settings = Settings()
if not settings.db_password.get_secret_value():
    raise RuntimeError("Configura COMUNIDAD_DB_PASSWORD antes de ejecutar Alembic")
url = settings.database_url()


def run_migrations_offline() -> None:
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(
        url,
        poolclass=pool.NullPool,
        connect_args={"connect_timeout": settings.db_connect_timeout},
    )
    try:
        with connectable.connect() as connection:
            context.configure(
                connection=connection, target_metadata=target_metadata, compare_type=True
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
