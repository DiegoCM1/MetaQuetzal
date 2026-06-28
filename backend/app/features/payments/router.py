from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.features.users.service import get_user_by_firebase_uid
from .schemas import CheckoutRequest, CheckoutResponse, PlanResponse, SimulateRequest, SubscriptionResponse
from .service import create_checkout_session, get_plans, get_subscription, upsert_subscription

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


@router.get("/plans", response_model=list[PlanResponse])
async def list_plans():
    return await get_plans()


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_my_subscription(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    db_user = await get_user_by_firebase_uid(db, user["uid"])
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return await get_subscription(db, int(db_user["id"]))


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if body.plan_slug in ("free", "edu"):
        raise HTTPException(status_code=400, detail="This plan is free — no checkout needed.")
    if body.billing_period not in ("monthly", "annual"):
        raise HTTPException(status_code=400, detail="billing_period must be 'monthly' or 'annual'.")

    db_user = await get_user_by_firebase_uid(db, user["uid"])
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    checkout_url = await create_checkout_session(
        db,
        user_id=int(db_user["id"]),
        plan_slug=body.plan_slug,
        billing_period=body.billing_period,
        user_email=str(db_user.get("email") or ""),
        success_url="https://backend-blueye-staging.up.railway.app/subscription/success",
        cancel_url="https://backend-blueye-staging.up.railway.app/subscription/cancel",
        provider=body.provider,
    )

    if not checkout_url:
        raise HTTPException(
            status_code=503,
            detail="Payment processing unavailable. Configure STRIPE_SECRET_KEY or MP_ACCESS_TOKEN.",
        )

    return {"checkout_url": checkout_url}


# ── Dev-only: simulate a subscription without payment ──────────────────────────
@router.post("/dev/simulate", response_model=SubscriptionResponse)
async def dev_simulate_subscription(
    body: SimulateRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if not settings.DEV_BYPASS_MAP_EVENTS_AUTH:
        raise HTTPException(status_code=403, detail="Only available in dev environments.")

    db_user = await get_user_by_firebase_uid(db, user["uid"])
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return await upsert_subscription(db, int(db_user["id"]), body.plan_slug, body.billing_period)


# ── Stripe webhook ─────────────────────────────────────────────────────────────
@router.post("/webhook/stripe")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")

    try:
        import stripe  # type: ignore
        stripe.api_key = settings.STRIPE_SECRET_KEY

        event = (
            stripe.Webhook.construct_event(payload, sig, webhook_secret)
            if webhook_secret
            else stripe.Event.construct_from(
                __import__("json").loads(payload), stripe.api_key
            )
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        meta = session.get("metadata", {})
        user_id = meta.get("user_id")
        plan_slug = meta.get("plan_slug")
        billing_period = meta.get("billing_period", "monthly")

        if user_id and plan_slug:
            await upsert_subscription(db, int(user_id), plan_slug, billing_period)

    return {"status": "ok"}


# ── MercadoPago webhook ────────────────────────────────────────────────────────
@router.post("/webhook/mercadopago")
async def mp_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    data = await request.json()
    if data.get("type") != "payment":
        return {"status": "ignored"}

    try:
        import mercadopago  # type: ignore
        sdk = mercadopago.SDK(settings.MP_ACCESS_TOKEN)
        payment_id = data["data"]["id"]
        payment = sdk.payment().get(payment_id)["response"]

        if payment.get("status") != "approved":
            return {"status": "not_approved"}

        external_ref = payment.get("external_reference", "")
        parts = external_ref.split(":")
        if len(parts) != 3:
            return {"status": "bad_reference"}

        user_id, plan_slug, billing_period = parts
        await upsert_subscription(db, int(user_id), plan_slug, billing_period)
    except Exception:
        pass

    return {"status": "ok"}
