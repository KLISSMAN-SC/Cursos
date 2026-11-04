from collections.abc import Iterator

from fastapi import Request
from sqlalchemy.orm import Session

from app.database.connection import Database


def get_database(request: Request) -> Database:
    return request.app.state.database


def get_session(request: Request) -> Iterator[Session]:
    with get_database(request).session() as session:
        yield session
