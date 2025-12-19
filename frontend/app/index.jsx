import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { hasCompletedOnboarding } from "./onboarding/_services/onboardingService";

export default function Index() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await hasCompletedOnboarding();

      if (completed) {
        // User has completed onboarding, go to main app
        router.replace("/(tabs)/MapScreen");
      } else {
        // First time user, show onboarding
        router.replace("/onboarding/step1");
      }
    } catch (error) {
      console.error("Error checking onboarding:", error);
      // On error, default to onboarding for safety
      router.replace("/onboarding/step1");
    } finally {
      setIsChecking(false);
    }
  };

  // Show nothing while checking (Expo splash screen will display)
  if (isChecking) {
    return null;
  }

  return null;
}