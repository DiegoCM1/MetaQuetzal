from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    #Database
    DATABASE_URL:str

    #Firebase
    FIREBASE_PROJECT_ID: str
    FIREBASE_CLIENT_EMAIL: str
    FIREBASE_PRIVATE_KEY: str

    #Notifications
    NOTIF_API_KEY:str

    #OpenWeather
    OPENWEATHER_API_KEY:str

    # AI (optional - only needed for ai/chat feature)
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = ""
    LLM_MODEL: str = ""

    # Web search tool (optional - only needed for the AI web_search tool)
    TAVILY_API_KEY: str = ""
    # "basic" = 1 credit/search, "advanced" = 2 credits/search. Flip via env,
    # no code change. Default basic to stretch the free-tier monthly quota.
    TAVILY_SEARCH_DEPTH: str = "basic"

    # Payments — Stripe (optional; omit to disable checkout)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_SAFE_MONTHLY: str = ""
    STRIPE_PRICE_SAFE_ANNUAL: str = ""
    STRIPE_PRICE_GUARD_MONTHLY: str = ""
    STRIPE_PRICE_GUARD_ANNUAL: str = ""

    # Payments — MercadoPago (optional; omit to disable)
    MP_ACCESS_TOKEN: str = ""

    # Dev-only bypasses
    DEV_BYPASS_MAP_EVENTS_AUTH: bool = False
    # When true, any authenticated Firebase user can call the notification test endpoints.
    # Set to true in Railway staging. Never set in production.
    DEV_BYPASS_NOTIF_TEST_AUTH: bool = False

    # Notification test tool — comma-separated emails allowed to call POST /api/v1/notifications/test.
    # Empty string disables the endpoint for everyone (production default).
    NOTIFICATION_TEST_ADMIN_EMAILS: str = ""

    model_config = SettingsConfigDict(env_file=(".env", ".env.local"))

settings = Settings()
