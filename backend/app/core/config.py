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

    # AI 
    LLM_API_KEY: str                                                  
    LLM_BASE_URL: str                                                 
    LLM_MODEL: str

    # Dev-only bypasses
    DEV_BYPASS_MAP_EVENTS_AUTH: bool = False

    model_config = SettingsConfigDict(env_file=(".env", ".env.local"))

settings = Settings()
