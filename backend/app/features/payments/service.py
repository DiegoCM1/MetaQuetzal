from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional

PLANS = [
    {
        "slug": "free",
        "name": "Bluai",
        "description": "Protección básica para ti",
        "monthly_price": None,
        "annual_price": None,
        "annual_discount": 0,
        "features": [
            "IA Empática Offline",
            "Mapa de Riesgos y Apoyo",
            "Alertas SIAT-CT Oficiales",
        ],
        "is_free": True,
    },
    {
        "slug": "safe",
        "name": "Bluai Safe",
        "description": "Para familias que quieren estar siempre conectadas",
        "monthly_price": 4.99,
        "annual_price": 49.90,
        "annual_discount": 17,
        "features": [
            "Todo el plan Gratuito",
            "Geolocalización de Familiares",
            "Botón de Pánico",
        ],
        "is_free": False,
    },
    {
        "slug": "guard",
        "name": "Blu Guard",
        "description": "Gestión de equipos y personal crítico",
        "monthly_price": 9.99,
        "annual_price": 99.90,
        "annual_discount": 17,
        "features": [
            "Todo el plan Safe",
            "Gestión de Personal Crítico",
            "Dashboard Predictivo Centralizado",
            "Comunicación Ininterrumpida",
        ],
        "is_free": False,
    },
    {
        "slug": "edu",
        "name": "Blu Edu",
        "description": "Para instituciones educativas",
        "monthly_price": None,
        "annual_price": None,
        "annual_discount": 0,
        "features": [
            "Todo el plan Gratuito",
            "Geolocalización",
            "Botón de Pánico",
            "Módulos de Resiliencia",
        ],
        "is_free": True,
    },
]


async def get_plans() -> list[dict]:
    return PLANS


async def upsert_subscription(db: AsyncSession, user_id: int, plan_slug: str, billing_period: str = "monthly") -> dict:
    from datetime import datetime, timedelta
    period_end = datetime.utcnow() + timedelta(days=365 if billing_period == "annual" else 30)
    await db.execute(
        text("""
            INSERT INTO subscriptions (user_id, plan_slug, status, billing_period, current_period_end)
            VALUES (:uid, :plan, 'active', :period, :end)
            ON CONFLICT (user_id) DO UPDATE
              SET plan_slug = EXCLUDED.plan_slug,
                  status = 'active',
                  billing_period = EXCLUDED.billing_period,
                  current_period_end = EXCLUDED.current_period_end
        """),
        {"uid": user_id, "plan": plan_slug, "period": billing_period, "end": period_end},
    )
    await db.commit()
    return {"plan_slug": plan_slug, "status": "active", "current_period_end": period_end.isoformat()}


async def get_subscription(db: AsyncSession, user_id: int) -> dict:
    result = await db.execute(
        text("SELECT plan_slug, status, current_period_end FROM subscriptions WHERE user_id = :uid"),
        {"uid": user_id},
    )
    row = result.fetchone()
    if not row:
        return {"plan_slug": "free", "status": "active", "current_period_end": None}
    return {
        "plan_slug": row.plan_slug,
        "status": row.status,
        "current_period_end": row.current_period_end.isoformat() if row.current_period_end else None,
    }


_PLAN_PRICES = {
    ("safe", "monthly"): ("Bluai Safe — Mensual",  4.99),
    ("safe", "annual"):  ("Bluai Safe — Anual",    49.90),
    ("guard", "monthly"): ("Blu Guard — Mensual",  9.99),
    ("guard", "annual"):  ("Blu Guard — Anual",    99.90),
}


async def _create_stripe_session(
    plan_slug: str,
    billing_period: str,
    user_email: str,
    success_url: str,
    cancel_url: str,
    user_id: int,
) -> Optional[str]:
    from app.core.config import settings
    import stripe  # type: ignore

    stripe_key = getattr(settings, "STRIPE_SECRET_KEY", "")
    if not stripe_key:
        return None

    try:
        stripe.api_key = stripe_key

        inline_prices = {
            ("safe", "monthly"): {"currency": "usd", "unit_amount": 499,  "recurring": {"interval": "month"}, "product_data": {"name": "Bluai Safe — Mensual"}},
            ("safe", "annual"):  {"currency": "usd", "unit_amount": 4990, "recurring": {"interval": "year"},  "product_data": {"name": "Bluai Safe — Anual"}},
            ("guard", "monthly"): {"currency": "usd", "unit_amount": 999,  "recurring": {"interval": "month"}, "product_data": {"name": "Blu Guard — Mensual"}},
            ("guard", "annual"):  {"currency": "usd", "unit_amount": 9990, "recurring": {"interval": "year"},  "product_data": {"name": "Blu Guard — Anual"}},
        }

        price_id = getattr(settings, f"STRIPE_PRICE_{plan_slug.upper()}_{billing_period.upper()}", "")
        if price_id:
            line_items = [{"price": price_id, "quantity": 1}]
        else:
            price_data = inline_prices.get((plan_slug, billing_period))
            if not price_data:
                return None
            line_items = [{"price_data": price_data, "quantity": 1}]

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=line_items,
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=user_email or None,
            metadata={"user_id": str(user_id), "plan_slug": plan_slug, "billing_period": billing_period},
        )
        return session.url
    except Exception:
        return None


async def _create_mp_session(
    plan_slug: str,
    billing_period: str,
    user_email: str,
    success_url: str,
    cancel_url: str,
    user_id: int,
) -> Optional[str]:
    from app.core.config import settings

    access_token = getattr(settings, "MP_ACCESS_TOKEN", "")
    if not access_token:
        return None

    try:
        import mercadopago  # type: ignore

        sdk = mercadopago.SDK(access_token)
        item_data = _PLAN_PRICES.get((plan_slug, billing_period))
        if not item_data:
            return None

        title, price = item_data
        preference_data = {
            "items": [{"title": title, "quantity": 1, "unit_price": price, "currency_id": "USD"}],
            "payer": {"email": user_email or ""},
            "back_urls": {"success": success_url, "failure": cancel_url, "pending": success_url},
            "auto_return": "approved",
            "external_reference": f"{user_id}:{plan_slug}:{billing_period}",
        }

        result = sdk.preference().create(preference_data)
        preference = result.get("response", {})
        is_sandbox = access_token.startswith("TEST-")
        return preference.get("sandbox_init_point" if is_sandbox else "init_point")
    except Exception:
        return None


async def create_checkout_session(
    db: AsyncSession,
    user_id: int,
    plan_slug: str,
    billing_period: str,
    user_email: str,
    success_url: str,
    cancel_url: str,
    provider: str = "auto",
) -> Optional[str]:
    if provider == "mercadopago":
        return await _create_mp_session(plan_slug, billing_period, user_email, success_url, cancel_url, user_id)
    if provider == "stripe":
        return await _create_stripe_session(plan_slug, billing_period, user_email, success_url, cancel_url, user_id)
    # auto: prefer stripe, fallback to mercadopago
    url = await _create_stripe_session(plan_slug, billing_period, user_email, success_url, cancel_url, user_id)
    if not url:
        url = await _create_mp_session(plan_slug, billing_period, user_email, success_url, cancel_url, user_id)
    return url
