from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.review import Review, ReviewModeration
from app.schemas.review import ReviewCreate, ReviewPage, ReviewSummary


def list_reviews(session: Session, course_id: int, limit: int, offset: int) -> ReviewPage:
    visible = (Review.curso_id == course_id, Review.oculta.is_(False))
    counts = dict(
        session.execute(
            select(Review.calificacion, func.count()).where(*visible).group_by(Review.calificacion)
        ).all()
    )
    total = sum(counts.values())
    average = (
        float(
            (
                Decimal(sum(rating * count for rating, count in counts.items())) / Decimal(total)
            ).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
        )
        if total
        else None
    )
    items = session.scalars(
        select(Review).where(*visible).order_by(Review.id.desc()).offset(offset).limit(limit)
    ).all()
    return ReviewPage(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
        resumen=ReviewSummary(
            total=total,
            promedio=average,
            distribucion={str(r): counts.get(r, 0) for r in range(1, 6)},
        ),
    )


def create_review(session: Session, data: ReviewCreate, student_id: int) -> Review:
    review = Review(**data.model_dump(), estudiante_id=student_id)
    session.add(review)
    session.commit()
    session.refresh(review)
    return review


def hide_review(session: Session, review_id: int, admin_id: int, reason: str) -> ReviewModeration:
    # Solo la primera transacción cambia la fila y genera su auditoría.
    changed = session.scalar(
        update(Review)
        .where(Review.id == review_id, Review.oculta.is_(False))
        .values(oculta=True)
        .returning(Review.id)
    )
    if changed is None:
        if session.get(Review, review_id) is None:
            raise HTTPException(404, "La reseña no existe.")
        raise HTTPException(409, "La reseña ya fue ocultada.")
    moderation = ReviewModeration(resena_id=review_id, administrador_id=admin_id, motivo=reason)
    session.add(moderation)
    # El ocultamiento y la auditoría se confirman juntos; un fallo revierte ambos.
    session.commit()
    session.refresh(moderation)
    return moderation
