from pydantic import BaseModel
from typing import Optional


class PlanResponse(BaseModel):
    slug: str
    name: str
    description: str
    monthly_price: Optional[float]
    annual_price: Optional[float]
    annual_discount: int
    features: list[str]
    is_free: bool


class SubscriptionResponse(BaseModel):
    plan_slug: str
    status: str
    current_period_end: Optional[str]


class CheckoutRequest(BaseModel):
    plan_slug: str
    billing_period: str  # "monthly" | "annual"
    provider: str = "auto"  # "stripe" | "mercadopago" | "auto"


class CheckoutResponse(BaseModel):
    checkout_url: str


class SimulateRequest(BaseModel):
    plan_slug: str
    billing_period: str = "monthly"
