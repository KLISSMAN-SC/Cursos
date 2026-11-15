import hashlib

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.reward import ProcessedEvent, Reward
from app.schemas.reward import EventResult, ModuleCompleted, RewardPage

RULE = "modulo_completado_v1"


class EventConflict(ValueError):
    """Un emisor reutilizó un ID para un evento distinto."""


def process_module_completed(session: Session, event: ModuleCompleted) -> EventResult:
    event_id = str(event.evento_id)
    fingerprint = hashlib.sha256(event.model_dump_json().encode()).hexdigest()
    # Las restricciones únicas resuelven también carreras entre varios consumidores.
    for attempt in range(2):
        try:
            processed = session.get(ProcessedEvent, event_id)
            if processed is not None and processed.huella != fingerprint:
                raise EventConflict("ID de evento reutilizado con otro contenido")
            reward = session.scalar(
                select(Reward).where(
                    Reward.estudiante_id == event.estudiante_id,
                    Reward.curso_id == event.curso_id,
                    Reward.version_curso == event.version_curso,
                    Reward.modulo_id == event.modulo_id,
                    Reward.regla == RULE,
                )
            )
            granted = reward is None
            if granted:
                reward = Reward(
                    estudiante_id=event.estudiante_id,
                    curso_id=event.curso_id,
                    version_curso=event.version_curso,
                    modulo_id=event.modulo_id,
                    regla=RULE,
                    insignia="Módulo completado",
                    puntos=10,
                    obtenida_en=event.completado_en,
                )
                session.add(reward)
            if processed is None:
                session.add(ProcessedEvent(evento_id=event_id, huella=fingerprint))
            # Evento e insignia se confirman en la misma transacción local.
            session.commit()
            return EventResult(
                evento_id=event_id,
                recompensa_id=reward.id,
                premio_otorgado=granted,
                puntos_otorgados=10 if granted else 0,
            )
        except IntegrityError:
            session.rollback()
            if attempt:
                raise
    raise RuntimeError("No se pudo consolidar la recompensa")


def list_rewards(
    session: Session,
    student_id: int,
    course_id: int | None,
    limit: int,
    offset: int,
) -> RewardPage:
    conditions = [Reward.estudiante_id == student_id]
    if course_id is not None:
        conditions.append(Reward.curso_id == course_id)
    total, points = session.execute(
        select(func.count(Reward.id), func.coalesce(func.sum(Reward.puntos), 0)).where(*conditions)
    ).one()
    items = session.scalars(
        select(Reward).where(*conditions).order_by(Reward.id.desc()).limit(limit).offset(offset)
    ).all()
    return RewardPage(items=items, total=total, puntos=points, limit=limit, offset=offset)
