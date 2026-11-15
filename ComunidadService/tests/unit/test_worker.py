from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from app.events.worker import handle_message


def deliver(channel, database, settings, body=b"invalid-json", attempts=0):
    handle_message(
        channel,
        SimpleNamespace(delivery_tag=9),
        SimpleNamespace(headers={"comunidad-reintentos": attempts}, message_id="test"),
        body,
        database=database,
        settings=settings,
    )


def test_evento_invalido_se_confirma_solo_despues_de_preservarlo_en_dlq(settings):
    channel = Mock()
    deliver(channel, Mock(), settings)
    assert channel.basic_publish.call_args.kwargs["routing_key"].endswith(".dlq")
    assert channel.method_calls[-1][0] == "basic_ack"
    assert channel.basic_publish.call_args.kwargs["mandatory"] is True


def test_fallo_de_publicacion_no_confirma_el_evento_original(settings):
    channel = Mock()
    channel.basic_publish.side_effect = RuntimeError("Sin confirmación")
    with pytest.raises(RuntimeError):
        deliver(channel, Mock(), settings)
    channel.basic_ack.assert_not_called()


@pytest.mark.parametrize("attempts,suffix", [(0, ".retry"), (2, ".retry"), (3, ".dlq")])
def test_reintentos_limitados_y_dlq(settings, attempts, suffix):
    channel = Mock()
    database = Mock()
    database.session.side_effect = RuntimeError("fallo")
    body = (
        b'{"evento_id":"bfbd2577-38a7-45c4-8b81-6014be6f91cc","tipo":"ModuloCompletado",'
        b'"estudiante_id":1,"curso_id":1,"version_curso":1,"modulo_id":1,'
        b'"completado_en":"2026-11-14T12:00:00Z"}'
    )
    deliver(channel, database, settings, body, attempts)
    published = channel.basic_publish.call_args.kwargs
    assert published["routing_key"] == settings.event_queue + suffix
    assert published["properties"].headers["comunidad-reintentos"] == attempts + 1
    channel.basic_ack.assert_called_once_with(delivery_tag=9)
