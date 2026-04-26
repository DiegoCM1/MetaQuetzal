import logging
from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import auth
from app.core.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["users"])

@router.delete("/account")
async def delete_account(decoded_token: dict = Depends(get_current_user)):
    uid = decoded_token['uid']
    try:
        auth.delete_user(uid)
        return {"message": "Account deleted"}
    except auth.UserNotFoundError:
        logger.warning(f"Delete attempted for non-existent Firebase user: {uid}")
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        logger.error(f"Failed to delete Firebase user {uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account")
