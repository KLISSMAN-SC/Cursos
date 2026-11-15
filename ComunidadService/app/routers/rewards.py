from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import MAX_ID, Principal, require_student
from app.database.dependencies import get_session
from app.schemas.reward import RewardPage
from app.services.reward_service import list_rewards

router = APIRouter(prefix="/api/v1", tags=["Insignias y puntos"])


@router.get("/mis-logros", response_model=RewardPage)
def my_rewards(
    principal: Annotated[Principal, Depends(require_student)],
    session: Annotated[Session, Depends(get_session)],
    curso_id: Annotated[int | None, Query(gt=0, le=MAX_ID)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> RewardPage:
    return list_rewards(session, principal.id, curso_id, limit, offset)
