"""
`contacts_refresh` por plataforma (G).

El bug: el push de refresco iba en UN solo mensaje con bloque `notification`. En Android
el canal `contacts_refresh_silent` lo esconde; **iOS no tiene canales**, así que ahí un
bloque `notification` es una alerta y el usuario veía un **banner en blanco** cada vez que
se refrescaban sus contactos.

Lo que se prueba es justamente lo que no se puede ver desde el código de un solo mensaje:
que cada plataforma reciba la forma de payload que le corresponde, y que sean formas
mutuamente excluyentes (una exige el bloque `notification`, la otra exige su ausencia).
"""
import asyncio
from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from app.features.notifications.service import (
    get_tokens_by_platform,
    send_contacts_refresh_push,
)


class FakeMulticast(SimpleNamespace):
    """Sustituto de messaging.MulticastMessage que SÍ conserva lo que se le pasó.

    Hace falta porque `conftest.py` reemplaza `firebase_admin` por un `MagicMock`: ahí
    `messaging.MulticastMessage(...)` devuelve **siempre el mismo objeto memoizado**, así
    que dos mensajes distintos se ven idénticos y sus atributos son mocks. Con eso no se
    puede afirmar nada sobre la forma del payload, que es justo lo que se prueba aquí.

    Los defaults importan: el mensaje de iOS **no** pasa `notification`, y la prueba
    necesita leer `msg.notification is None` en vez de reventar con AttributeError.
    """

    def __init__(self, **kw):
        super().__init__(**{
            "notification": None, "data": None, "android": None,
            "apns": None, "webpush": None, "fcm_options": None, "tokens": [],
            **kw,
        })


@contextmanager
def _fake_messaging():
    """Namespace de `messaging` con clases reales-de-mentira que conservan atributos.

    `SimpleNamespace(**kwargs)` alcanza para los tipos anidados (Notification, Aps, …):
    solo se construyen con keywords y solo se leen por atributo. Que los campos que se
    les pasan sean los que el SDK real acepta está verificado aparte, contra
    firebase_admin de verdad, fuera de pytest.
    """
    with patch("app.features.notifications.service.messaging") as m:
        m.MulticastMessage = FakeMulticast
        for name in (
            "Notification", "AndroidConfig", "AndroidNotification",
            "APNSConfig", "APNSPayload", "Aps",
        ):
            setattr(m, name, SimpleNamespace)
        yield m


class FakeBatchResponse:
    def __init__(self, n: int):
        self.responses = [MagicMock(success=True) for _ in range(n)]
        self.success_count = n
        self.failure_count = 0


def _fake_db(rows: list[dict]):
    """DB doble que devuelve `rows` desde .mappings()."""
    db = MagicMock()
    result = MagicMock()
    result.mappings.return_value = rows
    db.execute = AsyncMock(return_value=result)
    return db


def _capture_sends(rows: list[dict]):
    """Corre send_contacts_refresh_push y devuelve los mensajes que se habrían mandado."""
    sent: list = []

    async def _fake_send(msg, *a, **kw):
        sent.append(msg)
        return FakeBatchResponse(len(msg.tokens))

    with _fake_messaging(), patch(
        "app.features.notifications.service._send_multicast_with_retry",
        new=_fake_send,
    ):
        asyncio.run(send_contacts_refresh_push(_fake_db(rows), [1, 2]))
    return sent


# ------------------------------------------------------------------ agrupación

def test_null_platform_counts_as_android():
    """Un token sin plataforma es de un build viejo — y solo Android tiene builds viejos."""
    rows = [
        {"token": "a", "platform": None},
        {"token": "b", "platform": "android"},
        {"token": "c", "platform": "ios"},
    ]
    grouped = asyncio.run(get_tokens_by_platform(_fake_db(rows), [1]))

    assert sorted(grouped["android"]) == ["a", "b"]
    assert grouped["ios"] == ["c"]


def test_unexpected_platform_value_falls_back_to_android():
    """Un valor inesperado no debe crear un bucket que nadie manda (push perdido en silencio)."""
    rows = [{"token": "weird", "platform": "web"}]
    grouped = asyncio.run(get_tokens_by_platform(_fake_db(rows), [1]))

    assert grouped["android"] == ["weird"]
    assert grouped["ios"] == []


def test_no_users_returns_empty_without_querying():
    db = MagicMock()
    db.execute = AsyncMock()
    assert asyncio.run(get_tokens_by_platform(db, [])) == {}
    db.execute.assert_not_called()


# ------------------------------------------------------------------- payloads

def test_android_payload_is_unchanged():
    """Regresión: Android tiene que seguir recibiendo EXACTAMENTE lo de antes."""
    sent = _capture_sends([{"token": "a", "platform": "android"}])

    assert len(sent) == 1
    msg = sent[0]
    assert msg.tokens == ["a"]
    # El bloque `notification` es obligatorio en Android: el canal es lo que lo esconde.
    assert msg.notification is not None
    assert msg.android.notification.channel_id == "contacts_refresh_silent"
    assert msg.android.priority == "high"
    assert msg.data == {"type": "contacts_refresh"}


def test_ios_payload_is_a_silent_background_push():
    sent = _capture_sends([{"token": "i", "platform": "ios"}])

    assert len(sent) == 1
    msg = sent[0]
    assert msg.tokens == ["i"]
    # Lo que arregla el bug: SIN bloque notification, si no iOS lo dibuja como alerta.
    assert msg.notification is None
    assert msg.apns.payload.aps.content_available is True
    assert msg.apns.headers["apns-push-type"] == "background"
    # Apple RECHAZA los background push con prioridad 10; tiene que ser 5.
    assert msg.apns.headers["apns-priority"] == "5"
    assert msg.data == {"type": "contacts_refresh"}


def test_mixed_fleet_sends_one_message_per_platform():
    sent = _capture_sends([
        {"token": "a1", "platform": "android"},
        {"token": "i1", "platform": "ios"},
        {"token": "a2", "platform": None},
    ])

    assert len(sent) == 2, "deben ser dos mensajes: los payloads son incompatibles"
    by_platform = {("ios" if m.notification is None else "android"): m for m in sent}
    assert sorted(by_platform["android"].tokens) == ["a1", "a2"]
    assert by_platform["ios"].tokens == ["i1"]


def test_android_only_fleet_sends_nothing_to_ios():
    """Estado de hoy: 0 tokens de iOS → la rama de iOS ni se ejecuta."""
    sent = _capture_sends([
        {"token": "a1", "platform": "android"},
        {"token": "a2", "platform": "android"},
    ])

    assert len(sent) == 1
    assert sent[0].notification is not None


def test_no_tokens_sends_nothing():
    assert _capture_sends([]) == []


# --------------------------------------------------------------- aislamiento

def test_ios_failure_does_not_block_android():
    """El refresh es comodidad, no alerta: que falle un lado no debe cancelar el otro."""
    sent: list = []

    async def _flaky(msg, *a, **kw):
        if msg.notification is None:      # el de iOS
            raise RuntimeError("APNs caído")
        sent.append(msg)
        return FakeBatchResponse(len(msg.tokens))

    rows = [
        {"token": "a1", "platform": "android"},
        {"token": "i1", "platform": "ios"},
    ]
    with _fake_messaging(), patch(
        "app.features.notifications.service._send_multicast_with_retry", new=_flaky
    ):
        asyncio.run(send_contacts_refresh_push(_fake_db(rows), [1]))

    assert len(sent) == 1, "Android debió mandarse aunque iOS reventara"
    assert sent[0].tokens == ["a1"]
