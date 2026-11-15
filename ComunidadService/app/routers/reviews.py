from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.clients.catalogo import CatalogClient, get_catalog_client
from app.core.security import MAX_ID, Principal, current_principal, require_admin, require_student
from app.database.dependencies import get_session
from app.schemas.review import (
    AdminReviewPage,
    ModerationRead,
    OwnReviewRead,
    ReviewCreate,
    ReviewHide,
    ReviewPage,
    ReviewRead,
    ReviewUpdate,
)
from app.services.review_service import (
    admin_reviews,
    create_review,
    edit_review,
    editable_review,
    hide_review,
    list_reviews,
    own_review,
)

router = APIRouter(prefix="/api/v1", tags=["Reseñas"])
SessionDependency = Annotated[Session, Depends(get_session)]
CatalogDependency = Annotated[CatalogClient, Depends(get_catalog_client)]


@router.get("/sesion", response_model=Principal, tags=["Sesión"])
def session_identity(principal: Annotated[Principal, Depends(current_principal)]) -> Principal:
    return principal


@router.get("/resenas", response_model=ReviewPage)
def reviews(
    session: SessionDependency,
    curso_id: Annotated[int, Query(gt=0, le=MAX_ID)],
    limit: Annotated[int, Query(ge=1, le=100)] = 6,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ReviewPage:
    return list_reviews(session, curso_id, limit, offset)


@router.post("/resenas", response_model=ReviewRead, status_code=201)
def publish(
    data: ReviewCreate,
    principal: Annotated[Principal, Depends(require_student)],
    session: SessionDependency,
    catalog: CatalogDependency,
):
    catalog.require_access(principal.id, data.curso_id)
    return create_review(session, data, principal.id)


@router.get("/resenas/mia", response_model=OwnReviewRead | None)
def mine(
    principal: Annotated[Principal, Depends(require_student)],
    session: SessionDependency,
    curso_id: Annotated[int, Query(gt=0, le=MAX_ID)],
):
    return own_review(session, principal.id, curso_id)


@router.patch("/resenas/{resena_id}", response_model=ReviewRead)
def edit(
    resena_id: Annotated[int, Path(gt=0, le=MAX_ID)],
    data: ReviewUpdate,
    principal: Annotated[Principal, Depends(require_student)],
    session: SessionDependency,
    catalog: CatalogDependency,
):
    review = editable_review(session, resena_id, principal.id)
    catalog.require_access(principal.id, review.curso_id)
    return edit_review(session, resena_id, principal.id, data)


@router.get("/admin/resenas", response_model=AdminReviewPage, tags=["Moderación"])
def moderation_list(
    principal: Annotated[Principal, Depends(require_admin)],
    session: SessionDependency,
    curso_id: Annotated[int | None, Query(gt=0, le=MAX_ID)] = None,
    estado: Literal["todas", "visibles", "ocultas"] = "todas",
    limit: Annotated[int, Query(ge=1, le=100)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return admin_reviews(session, curso_id, estado, limit, offset)


@router.patch("/resenas/{resena_id}/ocultar", response_model=ModerationRead)
def hide(
    resena_id: Annotated[int, Path(gt=0, le=MAX_ID)],
    data: ReviewHide,
    principal: Annotated[Principal, Depends(require_admin)],
    session: SessionDependency,
):
    return hide_review(session, resena_id, principal.id, data.motivo)
