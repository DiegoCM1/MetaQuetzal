from fastapi import Header, HTTPException
from firebase_admin import auth

async def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Malformed/Inexistent Bearer Token")
    
    parts = authorization.split(' ', 1)

    token = parts[1]

    try:
        decoded_token = auth.verify_id_token(token)
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Firebase Rejected, Invalid token. Unauthorized")
        
    return decoded_token

