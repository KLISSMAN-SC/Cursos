"""Regresión de los timestamps x-death que RabbitMQ agrega al reintentar."""

import warnings
from datetime import UTC, datetime

from pika import data


def test_cabecera_dead_letter_se_decodifica_con_avisos_como_errores():
    completed = datetime(2026, 11, 14, 18, 0, tzinfo=UTC)
    headers = {
        "x-death": [
            {
                "time": completed,
                "reason": "expired",
                "count": 1,
                "queue": "comunidad.modulos.retry",
            }
        ],
    }
    pieces = []
    data.encode_table(pieces, headers)
    encoded = b"".join(pieces)
    with warnings.catch_warnings():
        warnings.simplefilter("error")
        decoded, offset = data.decode_table(encoded, 0)
    assert offset == len(encoded)
    death = decoded["x-death"][0]
    assert death["time"].replace(tzinfo=UTC) == completed
    assert death["reason"] == "expired" and death["count"] == 1
