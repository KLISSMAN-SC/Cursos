"""El Catálogo es dueño de los derechos. Comunidad nunca consulta su base."""

import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

from fastapi import HTTPException
from fastapi import Request as FastAPIRequest
from pydantic import BaseModel, ConfigDict, ValidationError

from app.core.config import Settings
from app.schemas.review import PositiveId


class AccessRight(BaseModel):
    model_config = ConfigDict(strict=True)
    estudiante_id: PositiveId
    curso_id: PositiveId
    estado: str


class CatalogClient:
    def __init__(self, settings: Settings):
        self.settings = settings

    def require_access(self, student_id: int, course_id: int) -> None:
        base = self.settings.catalogo_base_url.rstrip("/")
        secret = self.settings.catalogo_service_token.get_secret_value()
        if not base or not secret or urlsplit(base).scheme not in ("http", "https"):
            raise HTTPException(503, "La verificación de acceso con Catálogo no está configurada.")
        query = urlencode({"estudiante_id": student_id, "curso_id": course_id})
        request = Request(
            f"{base}/api/v1/derechos?{query}",
            headers={"Authorization": f"Bearer {secret}", "Accept": "application/json"},
        )
        try:
            with urlopen(request, timeout=self.settings.catalogo_timeout) as response:
                if response.status != 200:
                    raise ValueError("Respuesta inesperada")
                right = AccessRight.model_validate(json.load(response))
            if right.estudiante_id != student_id or right.curso_id != course_id:
                raise ValueError("El derecho no corresponde a la solicitud")
        except HTTPError as exc:
            if exc.code == 404:
                raise HTTPException(
                    403, "Necesitas acceso vigente al curso para reseñarlo."
                ) from exc
            raise HTTPException(
                503, "No pudimos verificar tu acceso al curso. Inténtalo después."
            ) from exc
        except (URLError, OSError, ValueError, ValidationError) as exc:
            raise HTTPException(
                503, "No pudimos verificar tu acceso al curso. Inténtalo después."
            ) from exc
        if right.estado not in ("ACTIVO", "PENDIENTE", "REVOCADO", "INEXISTENTE"):
            raise HTTPException(503, "Catálogo devolvió un estado de acceso desconocido.")
        if right.estado != "ACTIVO":
            raise HTTPException(403, "Necesitas acceso vigente al curso para reseñarlo.")


def get_catalog_client(request: FastAPIRequest) -> CatalogClient:
    return request.app.state.catalog_client
