from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings


class DatabaseNotConfigured(RuntimeError):
    pass


class Database:
    def __init__(self, settings: Settings, *, engine: Engine | None = None):
        self.engine = engine
        if self.engine is None and settings.db_password.get_secret_value():
            self.engine = create_engine(
                settings.database_url(),
                pool_pre_ping=True,
                connect_args={"connect_timeout": settings.db_connect_timeout},
            )
        self.sessions = (
            sessionmaker(bind=self.engine, expire_on_commit=False)
            if self.engine is not None
            else None
        )

    @contextmanager
    def session(self) -> Iterator[Session]:
        if self.sessions is None:
            raise DatabaseNotConfigured("Falta configurar la base de datos")
        with self.sessions() as session:
            yield session

    def ping(self) -> str:
        with self.session() as session:
            session.execute(text("SELECT 1")).scalar_one()
            bind = session.get_bind()
            if bind.dialect.name == "postgresql":
                return str(session.execute(text("SELECT current_database()")).scalar_one())
            # Motor inyectado por las pruebas: no se configura SQLite en producción.
            return str(bind.url.database)

    def close(self) -> None:
        if self.engine is not None:
            self.engine.dispose()
