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
