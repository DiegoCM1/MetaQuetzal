  
# Frontend

Option A — Physical phone (EAS cloud build)
1. npm install -g eas-cli                                                                                                    
2. eas build --profile development --platform android (Add --local flag to compile the code in your hardware)
  2.1 eas build --profile preview --platform android (Add --local flag to compile the code in your hardware)
  2.2 eas build --profile production --platform android (Add --local flag to compile the code in your hardware) 
3. Builds remotely → downloads APK → install on your phone → test there.

Option A.1 - Cancel a build
1. eas build:cancel id-from-build    

Option B — Emulator or local build trouhgt cable
1. npx expo run:android
2. npx expo run:android --variant release (For testing prod environment)


Option C — Actual Phone
1. npx expo start (For only starting the server)
2. Connect scanning the qr with your phone


# Backend

uvicorn app.main:app --reload 

## Testing 

Test backend:
1. cd backend/
2. pytest