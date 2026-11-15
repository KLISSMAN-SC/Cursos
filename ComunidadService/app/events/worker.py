"""Consumidor independiente: python -m app.events.worker."""

import logging
import time

import pika
from pydantic import ValidationError

from app.core.config import Settings
from app.database.connection import Database
from app.schemas.reward import ModuleCompleted
from app.services.reward_service import EventConflict, process_module_completed

logger = logging.getLogger(__name__)


def connect(settings: Settings):
    password = settings.rabbitmq_password.get_secret_value()
    if not password:
        raise RuntimeError("Configura COMUNIDAD_RABBITMQ_PASSWORD")
    return pika.BlockingConnection(
        pika.ConnectionParameters(
            host=settings.rabbitmq_host,
            port=settings.rabbitmq_port,
            virtual_host=settings.rabbitmq_vhost,
            credentials=pika.PlainCredentials(settings.rabbitmq_user, password),
            heartbeat=60,
            blocked_connection_timeout=10,
            socket_timeout=5,
        )
    )


def declare_topology(channel, settings: Settings) -> None:
    queue = settings.event_queue
    channel.exchange_declare(exchange=settings.event_exchange, exchange_type="topic", durable=True)
    channel.queue_declare(
        queue=queue,
        durable=True,
        arguments={
            "x-queue-type": "quorum",
            "x-dead-letter-exchange": "",
            "x-dead-letter-routing-key": queue + ".dlq",
            "x-dead-letter-strategy": "at-least-once",
            "x-overflow": "reject-publish",
        },
    )
    channel.queue_bind(
        queue=queue, exchange=settings.event_exchange, routing_key=settings.event_routing_key
    )
    channel.queue_declare(queue=queue + ".dlq", durable=True, arguments={"x-queue-type": "quorum"})
    channel.queue_declare(
        queue=queue + ".retry",
        durable=True,
        arguments={
            "x-queue-type": "quorum",
            "x-message-ttl": settings.event_retry_delay_ms,
            "x-dead-letter-exchange": "",
            "x-dead-letter-routing-key": queue,
            "x-dead-letter-strategy": "at-least-once",
            "x-overflow": "reject-publish",
        },
    )
    channel.confirm_delivery()
    channel.basic_qos(prefetch_count=1)


def handle_message(
    channel, method, properties, body: bytes, *, database: Database, settings: Settings
) -> None:
    headers = dict(properties.headers or {})
    attempts = headers.get("comunidad-reintentos", 0)
    if type(attempts) is not int or attempts < 0:
        attempts = 0
    target = None
    try:
        if len(body) > 65536:
            raise EventConflict("Evento demasiado grande")
        event = ModuleCompleted.model_validate_json(body)
        with database.session() as session:
            process_module_completed(session, event)
    except (ValidationError, EventConflict) as exc:
        logger.warning("Evento enviado a DLQ (%s)", type(exc).__name__)
        target = settings.event_queue + ".dlq"
        headers["comunidad-error"] = type(exc).__name__
    except Exception as exc:
        # No registrar cuerpos, tokens, URLs con credenciales ni errores SQL completos.
        logger.warning("Procesamiento fallido (%s), intento %s", type(exc).__name__, attempts + 1)
        target = settings.event_queue + (
            ".retry" if attempts < settings.event_max_retries else ".dlq"
        )
        headers["comunidad-reintentos"] = attempts + 1
        headers["comunidad-error"] = type(exc).__name__
    if target:
        # Si publicar/confirmar falla, NO confirmar el original: RabbitMQ lo reentrega.
        channel.basic_publish(
            exchange="",
            routing_key=target,
            body=body,
            mandatory=True,
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2,
                headers=headers,
                message_id=properties.message_id,
            ),
        )
    # Solo después del commit de PostgreSQL o del reenvío confirmado.
    channel.basic_ack(delivery_tag=method.delivery_tag)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    # Pika no debe volcar parámetros de conexión al log de la aplicación.
    logging.getLogger("pika").setLevel(logging.CRITICAL)
    settings = Settings()
    if not settings.rabbitmq_password.get_secret_value():
        raise SystemExit("Configura COMUNIDAD_RABBITMQ_PASSWORD")
    database = Database(settings)
    connection = None
    try:
        while True:
            try:
                connection = connect(settings)
                channel = connection.channel()
                declare_topology(channel, settings)
                channel.basic_consume(
                    queue=settings.event_queue,
                    on_message_callback=lambda ch, method, props, body: handle_message(
                        ch, method, props, body, database=database, settings=settings
                    ),
                    auto_ack=False,
                )
                logger.info("Consumidor de Comunidad escuchando")
                channel.start_consuming()
            except (pika.exceptions.AMQPError, OSError) as exc:
                logger.warning("Broker no disponible (%s); reconectando", type(exc).__name__)
            finally:
                if connection is not None and connection.is_open:
                    connection.close()
            time.sleep(5)
    except KeyboardInterrupt:
        logger.info("Consumidor detenido")
    finally:
        database.close()


if __name__ == "__main__":
    main()
