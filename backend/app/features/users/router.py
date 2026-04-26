from fastapi import APIRouter, Depends                                                                                    
from firebase_admin import auth
from app.core.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.delete("/account")                                                                                                
async def delete_account(decoded_token: dict = Depends(get_current_user)):
    auth.delete_user(decoded_token['uid'])                                                                                
    return {"message": "Account deleted"}