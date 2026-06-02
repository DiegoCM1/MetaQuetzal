  
# Frontend

PRODUCTION BUILD
1. npx expo prebuild --clean -p android
2. cd android && ./gradlew clean && cd ..                                                                          
3. eas build --profile production --platform android --local     

Option A — Physical phone + (Creating builds EAS Cloud)
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
3. npx expo run:ios 


Option C — Actual Phone
1. npx expo start (For only starting the server)
2. Connect scanning the qr with your phone

----
IOS

CREATE AND .ipa FILE FOR PROD
eas build --platform ios --profile production

SUBMIT TO TESTFLIGHT
eas submit --platform ios --profile production

CREATE NEW DEV CLIENT
eas build --profile development --platform ios



# Backend

uvicorn app.main:app --reload 

## Testing 

Test backend:
1. cd backend/
2. pytest