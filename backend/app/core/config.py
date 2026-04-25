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

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()