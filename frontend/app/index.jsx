import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { hasCompletedOnboarding } from "./onboarding/_services/onboardingService";

// Keep the splash screen visible while we check onboarding status
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await hasCompletedOnboarding();
      console.log('🔍 App startup - Onboarding completed?', completed);

      if (completed) {
        // User has completed onboarding, go to main app
        console.log('✅ Redirecting to MapScreen');
        router.replace("/(tabs)/MapScreen");
      } else {
        // First time user, show onboarding
        console.log('⚠️ Redirecting to Onboarding');
        router.replace("/onboarding/step1");
      }
    } catch (error) {
      console.error("❌ Error checking onboarding:", error);
      // On error, default to onboarding for safety
      router.replace("/onboarding/step1");
    } finally {
      // Mark as ready and hide splash screen
      setIsReady(true);
      await SplashScreen.hideAsync();
    }
  };

  // Return null while loading (splash screen is visible)
  if (!isReady) {
    return null;
  }

  return null;
}