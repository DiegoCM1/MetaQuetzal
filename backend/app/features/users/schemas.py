from pydantic import BaseModel, Field
from datetime import datetime


class UserProfile(BaseModel):
    id: int
    firebase_uid: str
    display_name: str | None
    email: str | None
    phone: str | None
    lat: float | None
    lon: float | None
    created_at: datetime
    updated_at: datetime

    # Perfil capturado en el onboarding.
    first_name: str | None = None
    last_name: str | None = None
    address_1: str | None = None
    address_2: str | None = None
    zip_code: str | None = None
    state: str | None = None
    age_range: str | None = None

    # Viven en `notification_preferences`, no en `users`. Solo los pobla el camino de
    # lectura (`get_user_by_firebase_uid`, que hace el JOIN) y el PUT de perfil, que
    # responde releyendo. Los endpoints que contestan con un RETURNING de `users`
    # —upsert, PATCH de teléfono, PATCH de ubicación— los dejan en None por
    # construcción; por eso son opcionales y no tienen default numérico aquí.
    nervousness_level: int | None = None
    weather_info_level: int | None = None


class UserLocationUpdate(BaseModel):
    lat: float
    lon: float


class PhoneUpdate(BaseModel):
    # `max_length` no es política de validación, es guarda contra caída: la columna es
    # VARCHAR(30) y sin cota un string más largo revienta en Postgres como 500 en vez
    # de contestar 422. El formato del teléfono sigue sin validarse, a propósito.
    phone: str = Field(max_length=30)


class ProfileUpdate(BaseModel):
    """Escritura completa del perfil del onboarding.

    Todo es opcional para que un payload parcial nunca borre una columna que el cliente
    no mandó (ver `update_user_profile`). Cada cota replica el ancho exacto de su
    columna, que es lo que convierte una entrada demasiado larga en un 422 legible en
    lugar de un 500 por truncamiento del driver.
    """

    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    address_1: str | None = Field(default=None, max_length=255)
    address_2: str | None = Field(default=None, max_length=255)
    zip_code: str | None = Field(default=None, max_length=10)
    state: str | None = Field(default=None, max_length=60)
    age_range: str | None = Field(default=None, max_length=10)

    nervousness_level: int | None = Field(default=None, ge=1, le=10)
    weather_info_level: int | None = Field(default=None, ge=1, le=10)
