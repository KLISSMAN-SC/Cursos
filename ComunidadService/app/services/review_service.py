from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.review import Review, ReviewModeration
from app.schemas.review import (
    AdminReviewPage,
    AdminReviewRead,
    ReviewCreate,
    ReviewPage,
    ReviewSummary,
    ReviewUpdate,
)


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
    if active_review(session, student_id, data.curso_id):
        raise HTTPException(409, "Ya tienes una reseña activa en este curso. Puedes editarla.")
    review = Review(**data.model_dump(), estudiante_id=student_id)
    session.add(review)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        if active_review(session, student_id, data.curso_id):
            raise HTTPException(409, "Ya tienes una reseña activa en este curso. Puedes editarla.")
        raise
    session.refresh(review)
    return review


def active_review(session: Session, student_id: int, course_id: int) -> Review | None:
    return session.scalar(
        select(Review).where(
            Review.estudiante_id == student_id,
            Review.curso_id == course_id,
            Review.oculta.is_(False),
        )
    )


def own_review(session: Session, student_id: int, course_id: int) -> Review | None:
    return session.scalar(
        select(Review)
        .where(
            Review.estudiante_id == student_id,
            Review.curso_id == course_id,
        )
        .order_by(Review.oculta, Review.id.desc())
        .limit(1)
    )


def editable_review(session: Session, review_id: int, student_id: int) -> Review:
    review = session.get(Review, review_id)
    if review is None:
        raise HTTPException(404, "La reseña no existe.")
    if review.estudiante_id != student_id:
        raise HTTPException(403, "Solo puedes editar tus propias reseñas.")
    if review.oculta:
        raise HTTPException(409, "Una reseña ocultada por moderación no se puede editar.")
    return review


def edit_review(session: Session, review_id: int, student_id: int, data: ReviewUpdate) -> Review:
    changed = session.scalar(
        update(Review)
        .where(Review.id == review_id, Review.estudiante_id == student_id, Review.oculta.is_(False))
        .values(**data.model_dump(), actualizada_en=datetime.now(UTC))
        .returning(Review.id)
    )
    if changed is None:
        raise HTTPException(409, "La reseña cambió durante la edición. Actualiza la página.")
    session.commit()
    session.expire_all()
    return session.get(Review, changed)


def admin_reviews(
    session: Session,
    course_id: int | None,
    state: str,
    limit: int,
    offset: int,
) -> AdminReviewPage:
    conditions = []
    if course_id is not None:
        conditions.append(Review.curso_id == course_id)
    if state != "todas":
        conditions.append(Review.oculta.is_(state == "ocultas"))
    total = session.scalar(select(func.count()).select_from(Review).where(*conditions))
    rows = session.execute(
        select(Review, ReviewModeration)
        .outerjoin(ReviewModeration, ReviewModeration.resena_id == Review.id)
        .where(*conditions)
        .order_by(Review.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return AdminReviewPage(
        items=[
            AdminReviewRead(
                **AdminReviewRead.model_validate(review).model_dump(exclude={"moderacion"}),
                moderacion=moderation,
            )
            for review, moderation in rows
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


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
