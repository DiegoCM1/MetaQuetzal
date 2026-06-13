from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.sos_contacts.schemas import SOSContactCreate, SOSContactUpdate


async def list_sos_contacts(db: AsyncSession, user_id: int) -> list[dict]:
    result = await db.execute(
        text("""
            SELECT id, user_id, name, phone, relationship, linked_user_id, link_status, created_at, updated_at
            FROM sos_contacts
            WHERE user_id = :user_id
            ORDER BY created_at ASC
        """),
        {"user_id": user_id},
    )
    return [dict(row) for row in result.mappings().all()]


async def create_sos_contact(db: AsyncSession, user_id: int, payload: SOSContactCreate) -> dict:
    result = await db.execute(
        text("""
            INSERT INTO sos_contacts (user_id, name, phone, relationship)
            VALUES (:user_id, :name, :phone, :relationship)
            RETURNING id, user_id, name, phone, relationship, linked_user_id, link_status, created_at, updated_at
        """),
        {
            "user_id": user_id,
            "name": payload.name.strip(),
            "phone": payload.phone.strip(),
            "relationship": payload.relationship.strip() if payload.relationship else None,
        },
    )
    await db.commit()
    return dict(result.mappings().first())


async def update_sos_contact(db: AsyncSession, contact_id: int, user_id: int, payload: SOSContactUpdate) -> dict:
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        row = await _get_contact_owned_by(db, contact_id, user_id)
        return row

    if "name" in updates:
        updates["name"] = updates["name"].strip()
    if "phone" in updates:
        updates["phone"] = updates["phone"].strip()
    if "relationship" in updates:
        updates["relationship"] = updates["relationship"].strip() if updates["relationship"] else None

    set_clause = ", ".join(f"{col} = :{col}" for col in updates)
    result = await db.execute(
        text(f"""
            UPDATE sos_contacts
            SET {set_clause}, updated_at = NOW()
            WHERE id = :contact_id AND user_id = :user_id
            RETURNING id, user_id, name, phone, relationship, linked_user_id, link_status, created_at, updated_at
        """),
        {**updates, "contact_id": contact_id, "user_id": user_id},
    )
    await db.commit()
    row = result.mappings().first()
    if row:
        return dict(row)

    await _raise_not_found_or_forbidden(db, contact_id, user_id)


async def delete_sos_contact(db: AsyncSession, contact_id: int, user_id: int) -> None:
    result = await db.execute(
        text("DELETE FROM sos_contacts WHERE id = :id AND user_id = :user_id RETURNING id"),
        {"id": contact_id, "user_id": user_id},
    )
    await db.commit()
    if result.fetchone():
        return
    await _raise_not_found_or_forbidden(db, contact_id, user_id)


async def get_who_has_me(db: AsyncSession, user_id: int) -> list[dict]:
    result = await db.execute(
        text("""
            SELECT sc.name, sc.relationship, sc.created_at,
                   u.display_name AS owner_display_name
            FROM sos_contacts sc
            JOIN users u ON u.id = sc.user_id
            WHERE sc.linked_user_id = :user_id AND sc.link_status = 'linked'
            ORDER BY sc.created_at ASC
        """),
        {"user_id": user_id},
    )
    return [dict(row) for row in result.mappings().all()]


async def _get_contact_owned_by(db: AsyncSession, contact_id: int, user_id: int) -> dict:
    result = await db.execute(
        text("""
            SELECT id, user_id, name, phone, relationship, linked_user_id, link_status, created_at, updated_at
            FROM sos_contacts WHERE id = :id AND user_id = :user_id
        """),
        {"id": contact_id, "user_id": user_id},
    )
    row = result.mappings().first()
    if not row:
        await _raise_not_found_or_forbidden(db, contact_id, user_id)
    return dict(row)


async def _raise_not_found_or_forbidden(db: AsyncSession, contact_id: int, user_id: int) -> None:
    exists = await db.execute(
        text("SELECT user_id FROM sos_contacts WHERE id = :id"),
        {"id": contact_id},
    )
    row = exists.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="SOS contact not found")
    raise HTTPException(status_code=403, detail="SOS contact does not belong to this user")
