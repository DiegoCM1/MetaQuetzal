import secrets

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

DEEP_LINK_BASE = "blueye://sos-invite"


async def create_invite(
    db: AsyncSession,
    inviter_id: int,
    inviter_display_name: str,
    contact_id: int,
) -> dict:
    contact = await db.execute(
        text("SELECT name, link_status, user_id FROM sos_contacts WHERE id = :id"),
        {"id": contact_id},
    )
    row = contact.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="SOS contact not found")
    if int(row["user_id"]) != inviter_id:
        raise HTTPException(status_code=403, detail="SOS contact does not belong to this user")
    if row["link_status"] == "linked":
        raise HTTPException(status_code=409, detail="Contact is already linked to an app user")

    token = secrets.token_urlsafe(32)
    result = await db.execute(
        text("""
            INSERT INTO sos_invitations
                (token, inviter_id, inviter_display_name, contact_id, contact_name)
            VALUES
                (:token, :inviter_id, :inviter_display_name, :contact_id, :contact_name)
            ON CONFLICT (contact_id) DO UPDATE SET
                token                = EXCLUDED.token,
                inviter_display_name = EXCLUDED.inviter_display_name,
                contact_name         = EXCLUDED.contact_name,
                expires_at           = NOW() + INTERVAL '72 hours',
                accepted_at          = NULL,
                accepted_user_id     = NULL,
                revoked_at           = NULL,
                created_at           = NOW()
            RETURNING token, expires_at
        """),
        {
            "token": token,
            "inviter_id": inviter_id,
            "inviter_display_name": inviter_display_name or "Un usuario de BluEye",
            "contact_id": contact_id,
            "contact_name": row["name"],
        },
    )
    await db.execute(
        text("UPDATE sos_contacts SET link_status = 'invite_sent' WHERE id = :id"),
        {"id": contact_id},
    )
    await db.commit()

    inv = result.mappings().first()
    return {
        "share_url": f"{DEEP_LINK_BASE}/{inv['token']}",
        "expires_at": inv["expires_at"],
    }


async def get_invite_preview(db: AsyncSession, token: str) -> dict:
    result = await db.execute(
        text("""
            SELECT inviter_display_name, contact_name, expires_at,
                   (expires_at > NOW()) AS is_valid,
                   accepted_at, revoked_at
            FROM sos_invitations WHERE token = :token
        """),
        {"token": token},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if not row["is_valid"] or row["revoked_at"] is not None:
        raise HTTPException(status_code=410, detail="Invitation expired or revoked")
    if row["accepted_at"] is not None:
        raise HTTPException(status_code=409, detail="Invitation already accepted")
    return {
        "inviter_display_name": row["inviter_display_name"] or "Un usuario de BluEye",
        "contact_name": row["contact_name"],
        "expires_at": row["expires_at"],
    }


async def accept_invite(db: AsyncSession, token: str, caller_user_id: int) -> dict:
    result = await db.execute(
        text("""
            SELECT id, inviter_id, inviter_display_name, contact_id, contact_name,
                   (expires_at > NOW()) AS is_valid,
                   accepted_at, revoked_at
            FROM sos_invitations WHERE token = :token
        """),
        {"token": token},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if not row["is_valid"] or row["revoked_at"] is not None:
        raise HTTPException(status_code=410, detail="Invitation expired or revoked")
    if row["accepted_at"] is not None:
        raise HTTPException(status_code=409, detail="Invitation already accepted")
    if int(row["inviter_id"]) == caller_user_id:
        raise HTTPException(status_code=400, detail="Cannot accept your own invitation")

    await db.execute(
        text("""
            UPDATE sos_contacts
            SET linked_user_id = :user_id, link_status = 'linked'
            WHERE id = :contact_id
        """),
        {"user_id": caller_user_id, "contact_id": row["contact_id"]},
    )
    await db.execute(
        text("""
            UPDATE sos_invitations
            SET accepted_at = NOW(), accepted_user_id = :user_id
            WHERE token = :token
        """),
        {"user_id": caller_user_id, "token": token},
    )
    await db.commit()

    return {
        "inviter_display_name": row["inviter_display_name"] or "Un usuario de BluEye",
        "contact_name": row["contact_name"],
    }
