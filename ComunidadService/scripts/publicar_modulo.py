"""Publicador de laboratorio; no otorga premios mediante una API pública."""

import argparse
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pika

from app.core.config import Settings
from app.events.worker import connect, declare_topology
from app.schemas.reward import ModuleCompleted


def main() -> None:
    parser = argparse.ArgumentParser(description="Publicar ModuloCompletado de laboratorio")
    parser.add_argument("--estudiante", type=int, default=1)
    parser.add_argument("--curso", type=int, default=1)
    parser.add_argument("--version", type=int, default=1)
    parser.add_argument("--modulo", type=int, default=1)
    parser.add_argument("--evento-id", type=UUID, default=None)
    parser.add_argument("--completado-en", default=None)
    parser.add_argument("--repetir", type=int, choices=range(1, 11), default=1)
    args = parser.parse_args()
    event = ModuleCompleted(
        evento_id=args.evento_id or uuid4(),
        tipo="ModuloCompletado",
        estudiante_id=args.estudiante,
        curso_id=args.curso,
        version_curso=args.version,
        modulo_id=args.modulo,
        completado_en=args.completado_en or datetime.now(UTC),
    )
    settings = Settings()
    connection = connect(settings)
    try:
        channel = connection.channel()
        declare_topology(channel, settings)
        for _ in range(args.repetir):
            channel.basic_publish(
                exchange=settings.event_exchange,
                routing_key=settings.event_routing_key,
                body=event.model_dump_json().encode(),
                mandatory=True,
                properties=pika.BasicProperties(
                    content_type="application/json",
                    delivery_mode=2,
                    message_id=str(event.evento_id),
                ),
            )
        print(f"Evento de laboratorio {event.evento_id} publicado {args.repetir} vez/veces.")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
