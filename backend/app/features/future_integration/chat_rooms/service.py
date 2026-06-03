from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession


async def ensure_chat_tables(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS chat_rooms (
                id         BIGSERIAL PRIMARY KEY,
                name       VARCHAR(120),
                type       VARCHAR(20) NOT NULL DEFAULT 'group',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS chat_members (
                room_id   BIGINT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
                user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (room_id, user_id)
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id         BIGSERIAL PRIMARY KEY,
                room_id    BIGINT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
                user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
                body       TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS chat_messages_room_idx ON chat_messages (room_id, created_at DESC)"
        ))


async def create_room(db: AsyncSession, name: str | None, room_type: str, user_id: int):
    result = await db.execute(
        text("""
            INSERT INTO chat_rooms (name, type) VALUES (:name, :type)
            RETURNING id, name, type, created_at
        """),
        {"name": name, "type": room_type},
    )
    room = result.mappings().first()
    # Add creator as member
    await db.execute(
        text("INSERT INTO chat_members (room_id, user_id) VALUES (:room_id, :user_id) ON CONFLICT DO NOTHING"),
        {"room_id": room["id"], "user_id": user_id},
    )
    await db.commit()
    return room


async def list_rooms(db: AsyncSession, user_id: int):
    result = await db.execute(
        text("""
            SELECT r.id, r.name, r.type, r.created_at
            FROM chat_rooms r
            JOIN chat_members m ON m.room_id = r.id
            WHERE m.user_id = :uid
            ORDER BY r.created_at DESC
        """),
        {"uid": user_id},
    )
    return result.mappings().all()


async def join_room(db: AsyncSession, room_id: int, user_id: int) -> bool:
    row = await db.execute(text("SELECT id FROM chat_rooms WHERE id = :rid"), {"rid": room_id})
    if row.mappings().first() is None:
        return False
    await db.execute(
        text("INSERT INTO chat_members (room_id, user_id) VALUES (:rid, :uid) ON CONFLICT DO NOTHING"),
        {"rid": room_id, "uid": user_id},
    )
    await db.commit()
    return True


async def send_message(db: AsyncSession, room_id: int, user_id: int, body: str):
    # Verify membership
    row = await db.execute(
        text("SELECT 1 FROM chat_members WHERE room_id = :rid AND user_id = :uid"),
        {"rid": room_id, "uid": user_id},
    )
    if row.first() is None:
        return None  # not a member

    result = await db.execute(
        text("""
            INSERT INTO chat_messages (room_id, user_id, body)
            VALUES (:room_id, :user_id, :body)
            RETURNING id, room_id, user_id, body, created_at
        """),
        {"room_id": room_id, "user_id": user_id, "body": body},
    )
    await db.commit()
    return result.mappings().first()


async def list_messages(db: AsyncSession, room_id: int, user_id: int, limit: int, offset: int):
    # Verify membership
    row = await db.execute(
        text("SELECT 1 FROM chat_members WHERE room_id = :rid AND user_id = :uid"),
        {"rid": room_id, "uid": user_id},
    )
    if row.first() is None:
        return None  # not a member

    result = await db.execute(
        text("""
            SELECT id, room_id, user_id, body, created_at
            FROM chat_messages WHERE room_id = :rid
            ORDER BY created_at DESC LIMIT :limit OFFSET :offset
        """),
        {"rid": room_id, "limit": limit, "offset": offset},
    )
    return result.mappings().all()
