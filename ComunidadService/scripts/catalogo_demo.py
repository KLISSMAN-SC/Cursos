"""Doble explícito de Catálogo para laboratorio. No es CatalogoService."""

import secrets
from typing import Annotated

from fastapi import FastAPI, Header, HTTPException, Query

from app.core.config import Settings

app = FastAPI(title="Catálogo simulado — solo laboratorio")


@app.get("/api/v1/derechos")
def access(
    estudiante_id: Annotated[int, Query(gt=0)],
    curso_id: Annotated[int, Query(gt=0)],
    authorization: Annotated[str, Header()] = "",
):
    secret = Settings().catalogo_service_token.get_secret_value()
    if not secret or not secrets.compare_digest(authorization, f"Bearer {secret}"):
        raise HTTPException(401, "Credencial de servicio inválida")
    return {
        "estudiante_id": estudiante_id,
        "curso_id": curso_id,
        "estado": "ACTIVO" if estudiante_id == 1 and curso_id == 1 else "INEXISTENTE",
    }
