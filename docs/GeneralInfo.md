  
# Frontend

Option A — Physical phone (EAS cloud build)
1. npm install -g eas-cli                                                                                                    
2. eas build --profile development --platform android
  2.1 eas build --profile preview --platform android
  2.2 eas build --profile production --platform android
3. Builds remotely → downloads APK → install on your phone → test there.

Option B — Emulator or local build trouhgt cable
1. npx expo run:android


Option C — Actual Phone
1. npx expo start (For only starting the server)
2. Connect scanning the qr with your phone


# Backend

uvicorn app.main:app --reload 

## Testing 

Test backend:
1. cd backend/
2. pytest