from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.core.security import MAX_ID, Principal, current_principal, require_admin, require_student
from app.database.dependencies import get_session
from app.schemas.review import ModerationRead, ReviewCreate, ReviewHide, ReviewPage, ReviewRead
from app.services.review_service import create_review, hide_review, list_reviews

router = APIRouter(prefix="/api/v1", tags=["Reseñas"])
SessionDependency = Annotated[Session, Depends(get_session)]


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
):
    return create_review(session, data, principal.id)


@router.patch("/resenas/{resena_id}/ocultar", response_model=ModerationRead)
def hide(
    resena_id: Annotated[int, Path(gt=0, le=MAX_ID)],
    data: ReviewHide,
    principal: Annotated[Principal, Depends(require_admin)],
    session: SessionDependency,
):
    return hide_review(session, resena_id, principal.id, data.motivo)
