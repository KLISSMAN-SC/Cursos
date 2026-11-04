from pathlib import Path
from typing import Annotated, Literal

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.core.config import SERVICE_ROOT

MAX_ID = 9_007_199_254_740_991
bearer = HTTPBearer(auto_error=False, description="JWT emitido por UsuarioService")


class Principal(BaseModel):
    id: int = Field(gt=0, le=MAX_ID)
    rol: Literal["ESTUDIANTE", "ADMIN"]


def unauthorized() -> HTTPException:
    return HTTPException(
        401, "La sesión no es válida o expiró.", headers={"WWW-Authenticate": "Bearer"}
    )


def current_principal(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Principal:
    if credentials is None:
        raise unauthorized()
    settings = request.app.state.settings
    path = Path(settings.jwt_public_key_file)
    if not path.is_absolute():
        path = SERVICE_ROOT / path
    try:
        key = path.read_text(encoding="utf-8")
    except (OSError, ValueError) as exc:
        raise HTTPException(503, "El servicio de autenticación aún no está configurado.") from exc
    try:
        claims = jwt.decode(
            credentials.credentials,
            key,
            algorithms=["RS256"],
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
            options={"require": ["sub", "exp", "iss", "aud", "rol"]},
            leeway=5,
        )
        subject = claims["sub"]
        if not isinstance(subject, str) or not subject.isascii() or not subject.isdecimal():
            raise unauthorized()
        identifier = int(subject)
        if not 0 < identifier <= MAX_ID or claims["rol"] not in ("ESTUDIANTE", "ADMIN"):
            raise unauthorized()
        return Principal(id=identifier, rol=claims["rol"])
    except jwt.InvalidKeyError as exc:
        raise HTTPException(503, "La configuración de autenticación no está disponible.") from exc
    except (jwt.InvalidTokenError, KeyError, ValueError, TypeError) as exc:
        raise unauthorized() from exc


def require_student(principal: Annotated[Principal, Depends(current_principal)]) -> Principal:
    if principal.rol != "ESTUDIANTE":
        raise HTTPException(403, "Solo los estudiantes pueden publicar reseñas.")
    return principal


def require_admin(principal: Annotated[Principal, Depends(current_principal)]) -> Principal:
    if principal.rol != "ADMIN":
        raise HTTPException(403, "Solo los administradores pueden moderar reseñas.")
    return principal
