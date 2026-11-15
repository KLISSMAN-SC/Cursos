"""AMQP real optativo; no utiliza las colas de desarrollo ni eventos reales."""

import os
import time
from datetime import UTC, datetime
from unittest.mock import Mock
from uuid import uuid4

import pika
import pytest

from app.core.config import Settings
from app.events.worker import connect, declare_topology, handle_message
from app.schemas.reward import ModuleCompleted

pytestmark = pytest.mark.skipif(
    not os.environ.get("COMUNIDAD_TEST_RABBITMQ_HOST"), reason="Sin broker de pruebas explícito"
)


@pytest.fixture
def broker():
    name = "comunidad_test_" + uuid4().hex
    settings = Settings(
        _env_file=None,
        rabbitmq_host=os.environ.get("COMUNIDAD_TEST_RABBITMQ_HOST", "127.0.0.1"),
        rabbitmq_port=int(os.environ.get("COMUNIDAD_TEST_RABBITMQ_PORT", "5672")),
        rabbitmq_user=os.environ.get("COMUNIDAD_TEST_RABBITMQ_USER", "comunidad"),
        rabbitmq_password=os.environ.get("COMUNIDAD_TEST_RABBITMQ_PASSWORD", ""),
        event_queue=name,
        event_exchange=name,
        event_retry_delay_ms=100,
    )
    connection = connect(settings)
    channel = connection.channel()
    declare_topology(channel, settings)
    try:
        yield channel, settings
    finally:
        for suffix in (".retry", ".dlq", ""):
            channel.queue_delete(queue=name + suffix)
        channel.exchange_delete(exchange=name)
        connection.close()


def publish(channel, settings, body):
    channel.basic_publish(
        exchange=settings.event_exchange,
        routing_key=settings.event_routing_key,
        body=body,
        mandatory=True,
        properties=pika.BasicProperties(delivery_mode=2, content_type="application/json"),
    )


def receive(channel, queue):
    for _ in range(50):
        delivery = channel.basic_get(queue=queue, auto_ack=False)
        if delivery[0] is not None:
            return delivery
        time.sleep(0.05)
    pytest.fail("El broker no entregó el mensaje esperado")


def test_rabbitmq_reentrega_real_y_mensaje_invalido_preservado(broker, api):
    channel, settings = broker
    client, database, token = api
    event = ModuleCompleted(
        evento_id=uuid4(),
        tipo="ModuloCompletado",
        estudiante_id=7,
        curso_id=1,
        version_curso=1,
        modulo_id=1,
        completado_en=datetime.now(UTC),
    )
    for _ in range(2):
        publish(channel, settings, event.model_dump_json().encode())
        method, properties, body = receive(channel, settings.event_queue)
        handle_message(channel, method, properties, body, database=database, settings=settings)
    assert client.get("/api/v1/mis-logros", headers=token()).json()["puntos"] == 10
    publish(channel, settings, b"invalid-json")
    method, properties, body = receive(channel, settings.event_queue)
    handle_message(channel, method, properties, body, database=database, settings=settings)
    method, _, body = receive(channel, settings.event_queue + ".dlq")
    assert body == b"invalid-json"
    channel.basic_ack(method.delivery_tag)


def test_rabbitmq_reintento_diferido_recupera_evento(broker, api):
    channel, settings = broker
    client, database, token = api
    event = ModuleCompleted(
        evento_id=uuid4(),
        tipo="ModuloCompletado",
        estudiante_id=7,
        curso_id=1,
        version_curso=1,
        modulo_id=1,
        completado_en=datetime.now(UTC),
    )
    publish(channel, settings, event.model_dump_json().encode())
    method, properties, body = receive(channel, settings.event_queue)
    unavailable = Mock()
    unavailable.session.side_effect = RuntimeError("Caída temporal")
    handle_message(channel, method, properties, body, database=unavailable, settings=settings)
    method, properties, body = receive(channel, settings.event_queue)
    assert properties.headers["comunidad-reintentos"] == 1
    handle_message(channel, method, properties, body, database=database, settings=settings)
    assert client.get("/api/v1/mis-logros", headers=token()).json()["puntos"] == 10
