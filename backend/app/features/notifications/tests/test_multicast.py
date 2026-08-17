"""
Chunking de multicast (corte de 500) + predicado de borrado de tokens.

Las dos cosas que se prueban aquí fallaban **en silencio**, que es la razón de que
existan estas pruebas y no una verificación manual:

- Arriba de 500 tokens, `send_each_for_multicast` lanza un `ValueError` del lado del
  cliente **antes de cualquier llamada de red** (firebase_admin/messaging.py:435). No hay
  error de Firebase, ni status HTTP, ni nada en consola: el push simplemente no sale.
- El predicado de borrado viejo (`if not r.success`) borraba el token ante *cualquier*
  fallo, incluidos los transitorios. El borrado destruye la evidencia, así que el bug
  se tapa a sí mismo.

Nota sobre los dobles: `conftest.py` sustituye `firebase_admin` por un `MagicMock`, así
que `messaging.BatchResponse` tampoco es real. Se usan objetos propios con la misma forma
(`.responses`, `.success_count`, `.failure_count`) — que es justo lo que consumen los call
sites.
"""
import asyncio
from unittest.mock import patch

from app.features.notifications.service import (
    FCM_MULTICAST_LIMIT,
    _rebuild_with_tokens,
    _send_multicast_with_retry,
    dead_tokens,
    summarize_push_failures,
)


class FakeException(Exception):
    """Excepción cuyo `type(...).__name__` se controla desde la prueba.

    El código de producción clasifica por nombre de clase (ver `dead_tokens`), así que
    para simular un `UnregisteredError` hay que fabricar una clase con ESE nombre — no
    basta un mensaje.
    """


def make_exc(name: str) -> Exception:
    return type(name, (FakeException,), {})(name)


class FakeSendResponse:
    def __init__(self, success: bool, exception: Exception | None = None):
        self.success = success
        self.exception = exception


class FakeBatchResponse:
    def __init__(self, responses: list[FakeSendResponse]):
        self.responses = responses

    @property
    def success_count(self) -> int:
        return sum(1 for r in self.responses if r.success)

    @property
    def failure_count(self) -> int:
        return len(self.responses) - self.success_count


class FakeMulticastMessage:
    """Sustituye a messaging.MulticastMessage, que bajo el mock no conserva atributos."""

    def __init__(self, tokens, data=None, notification=None, android=None,
                 webpush=None, apns=None, fcm_options=None):
        self.tokens = tokens
        self.data = data
        self.notification = notification
        self.android = android
        self.webpush = webpush
        self.apns = apns
        self.fcm_options = fcm_options


def _patched_send(recorder, dead=frozenset()):
    """Doble de `send_each_for_multicast` que registra cada chunk que recibe.

    Responde por token —éxito salvo que el token esté en `dead`— para poder verificar
    que el orden de las respuestas corresponde al orden de los tokens.
    """
    def _send(message, *args, **kwargs):
        recorder.append(list(message.tokens))
        return FakeBatchResponse([
            FakeSendResponse(False, make_exc("UnregisteredError")) if t in dead
            else FakeSendResponse(True)
            for t in message.tokens
        ])
    return _send


def _run(tokens, dead=frozenset()):
    """Corre _send_multicast_with_retry con los dobles. Devuelve (respuesta, chunks)."""
    recorder: list[list[str]] = []
    msg = FakeMulticastMessage(tokens=tokens, data={"k": "v"})

    with patch("app.features.notifications.service.messaging") as mock_messaging:
        mock_messaging.send_each_for_multicast = _patched_send(recorder, dead)
        mock_messaging.MulticastMessage = FakeMulticastMessage
        mock_messaging.BatchResponse = FakeBatchResponse
        response = asyncio.run(_send_multicast_with_retry(msg))

    return response, recorder


# --------------------------------------------------------------------------- chunking

def test_under_limit_sends_a_single_call():
    tokens = [f"t{i}" for i in range(10)]
    response, chunks = _run(tokens)

    assert len(chunks) == 1, "no debe partir nada por debajo del límite"
    assert chunks[0] == tokens
    assert response.success_count == 10


def test_exactly_at_limit_is_not_split():
    # 500 es válido: el SDK rechaza a partir de 501 (`> 500`). Partir aquí sería un
    # off-by-one que duplica llamadas sin razón.
    tokens = [f"t{i}" for i in range(FCM_MULTICAST_LIMIT)]
    _, chunks = _run(tokens)

    assert len(chunks) == 1
    assert len(chunks[0]) == FCM_MULTICAST_LIMIT


def test_over_limit_splits_and_no_chunk_exceeds_the_cap():
    tokens = [f"t{i}" for i in range(1200)]
    response, chunks = _run(tokens)

    assert len(chunks) == 3
    assert [len(c) for c in chunks] == [500, 500, 200]
    assert all(len(c) <= FCM_MULTICAST_LIMIT for c in chunks)
    # La respuesta agregada se ve igual que una sola llamada sin partir.
    assert len(response.responses) == 1200
    assert response.success_count == 1200


def test_chunking_preserves_token_order():
    """Carga estructural: los call sites hacen `tokens[i]` para saber cuál falló.

    Si el orden de `responses` no corresponde índice por índice con los tokens de
    entrada, se borra el token equivocado — y como el borrado destruye la evidencia,
    no quedaría forma de notarlo.
    """
    tokens = [f"t{i}" for i in range(1200)]
    # Uno muerto en cada chunk, incluido el último parcial.
    dead = {"t3", "t700", "t1150"}
    response, chunks = _run(tokens, dead=dead)

    # Los chunks concatenados tienen que reconstruir la lista original, en orden.
    assert [t for c in chunks for t in c] == tokens
    assert dead_tokens(tokens, response) == ["t3", "t700", "t1150"]


def test_chunk_failure_propagates_and_deletes_nothing():
    """Si un chunk falla del todo, se propaga: sin respuesta completa no se borra nada."""
    recorder: list[list[str]] = []
    msg = FakeMulticastMessage(tokens=[f"t{i}" for i in range(1200)])

    def _failing(message, *args, **kwargs):
        recorder.append(list(message.tokens))
        # Se identifica el chunk por su contenido, no por el número de llamada: con
        # `len(recorder) == 2` el reintento cae en la tercera llamada y "se arregla" solo,
        # que es como esta prueba pasaba en verde sin probar nada.
        if message.tokens[0] == "t500":   # el segundo chunk, en todos sus intentos
            raise ValueError("boom")
        return FakeBatchResponse([FakeSendResponse(True) for _ in message.tokens])

    with patch("app.features.notifications.service.messaging") as mock_messaging:
        mock_messaging.send_each_for_multicast = _failing
        mock_messaging.MulticastMessage = FakeMulticastMessage
        mock_messaging.BatchResponse = FakeBatchResponse
        with patch("asyncio.sleep", return_value=None):  # sin esperar el backoff
            try:
                asyncio.run(_send_multicast_with_retry(msg))
                raised = False
            except ValueError:
                raised = True

    assert raised, "un chunk fallido debe propagar, no devolver resultados parciales"


def test_rebuild_with_tokens_carries_every_field():
    """Si un campo no se copia, se pierde SOLO cuando hay chunking — o sea, solo en prod."""
    original = FakeMulticastMessage(
        tokens=["a", "b"], data={"k": "v"}, notification="N",
        android="A", webpush="W", apns="P", fcm_options="F",
    )
    with patch("app.features.notifications.service.messaging") as mock_messaging:
        mock_messaging.MulticastMessage = FakeMulticastMessage
        clone = _rebuild_with_tokens(original, ["c"])

    assert clone.tokens == ["c"]
    for field in ("data", "notification", "android", "webpush", "apns", "fcm_options"):
        assert getattr(clone, field) == getattr(original, field), f"se perdió {field}"


# -------------------------------------------------------------- predicado de borrado

def test_only_unregistered_tokens_are_deleted():
    """El corazón del bug: un aparato sano no se borra por un fallo transitorio."""
    tokens = ["dead", "quota", "apns", "ok", "unknown"]
    response = FakeBatchResponse([
        FakeSendResponse(False, make_exc("UnregisteredError")),
        FakeSendResponse(False, make_exc("QuotaExceededError")),
        FakeSendResponse(False, make_exc("ThirdPartyAuthError")),
        FakeSendResponse(True),
        FakeSendResponse(False, None),
    ])

    assert dead_tokens(tokens, response) == ["dead"]


def test_apns_misconfiguration_never_deletes_ios_devices():
    """ThirdPartyAuthError = 'la auth key de APNs es inválida'.

    Es el fallo más probable del primer rollout de iOS y llega **por token**. Con el
    predicado viejo, el backend respondía borrando justo los aparatos que uno está
    tratando de depurar: se registran, fallan, se borran, se re-registran, en bucle.
    """
    tokens = [f"ios{i}" for i in range(50)]
    response = FakeBatchResponse([
        FakeSendResponse(False, make_exc("ThirdPartyAuthError")) for _ in tokens
    ])

    assert dead_tokens(tokens, response) == []
    assert summarize_push_failures(response) == {"ThirdPartyAuthError": 50}


def test_unknown_failure_types_are_never_deleted():
    """Lista blanca: un tipo de error nuevo no debe traducirse en pérdida de datos."""
    tokens = ["a", "b"]
    response = FakeBatchResponse([
        FakeSendResponse(False, make_exc("SomeFutureFirebaseError")),
        FakeSendResponse(False, make_exc("SenderIdMismatchError")),
    ])

    assert dead_tokens(tokens, response) == []
