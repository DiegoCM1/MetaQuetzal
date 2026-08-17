from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

_ALL_FIELDS = "id, firebase_uid, display_name, email, phone, lat, lon, created_at, updated_at"


async def get_user_by_firebase_uid(db: AsyncSession, firebase_uid: str) -> dict | None:
    result = await db.execute(
        text(f"SELECT {_ALL_FIELDS} FROM users WHERE firebase_uid = :uid LIMIT 1"),
        {"uid": firebase_uid},
    )
    return result.mappings().first()


async def upsert_user(
    db: AsyncSession,
    firebase_uid: str,
    display_name: str | None = None,
    email: str | None = None,
) -> dict:
    """Create or update user profile from Firebase token. Idempotent."""
    result = await db.execute(
        text(f"""
            INSERT INTO users (firebase_uid, display_name, email)
            VALUES (:uid, :display_name, :email)
            ON CONFLICT (firebase_uid) DO UPDATE
                SET updated_at    = NOW(),
                    display_name  = COALESCE(EXCLUDED.display_name, users.display_name),
                    email         = COALESCE(EXCLUDED.email, users.email)
            RETURNING {_ALL_FIELDS}
        """),
        {"uid": firebase_uid, "display_name": display_name, "email": email},
    )
    await db.commit()
    return result.mappings().first()


async def update_user_phone(db: AsyncSession, firebase_uid: str, phone: str) -> dict | None:
    result = await db.execute(
        text(f"""
            UPDATE users SET phone = :phone, updated_at = NOW()
            WHERE firebase_uid = :uid
            RETURNING {_ALL_FIELDS}
        """),
        {"uid": firebase_uid, "phone": phone},
    )
    await db.commit()
    return result.mappings().first()


async def update_user_location(db: AsyncSession, firebase_uid: str, lat: float, lon: float) -> dict | None:
    result = await db.execute(
        text(f"""
            UPDATE users SET lat = :lat, lon = :lon, updated_at = NOW()
            WHERE firebase_uid = :uid
            RETURNING {_ALL_FIELDS}
        """),
        {"uid": firebase_uid, "lat": lat, "lon": lon},
    )
    await db.commit()
    return result.mappings().first()


async def delete_user_by_firebase_uid(db: AsyncSession, firebase_uid: str) -> bool:
    """Borra la fila de `users`. Devuelve True si existía.

    Todo lo demás cuelga de esto por FK: `device_tokens`, `notification_preferences`,
    `sos_contacts`, `sos_invitations` y `sos_events` van en cascada. Los push tokens
    son los que importan para la Guideline 5.1.1(v) — mientras esa fila viva, una
    cuenta "borrada" **sigue recibiendo alertas de huracán**.
    """
    result = await db.execute(
        text("DELETE FROM users WHERE firebase_uid = :uid RETURNING id"),
        {"uid": firebase_uid},
    )
    deleted = result.first() is not None
    await db.commit()
    return deleted
