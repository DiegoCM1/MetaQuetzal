import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { hasCompletedOnboarding } from "./onboarding/_services/onboardingService";
import { useAuth } from "../features/auth/AuthContext";

// Keep the splash screen visible while we check onboarding status
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();
  const { loading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    checkOnboardingStatus();
  }, [loading]);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await hasCompletedOnboarding();
      console.log('🔍 App startup - Onboarding completed?', completed);

      if (completed) {
        // Fast path: flag en AsyncStorage → directo a la app.
        // _layout.tsx redirigirá a /(auth) si la sesión no está activa.
        console.log('✅ Redirecting to MapScreen');
        router.replace("/(tabs)/MapScreen");
      } else {
        // Sin flag: ir a /(auth). _layout.tsx + checkAndRoute() decidirá si
        // hay que mostrar login, onboarding, o ir directo al mapa.
        console.log('⚠️ Sin flag de onboarding → (auth)');
        router.replace("/(auth)");
      }
    } catch (error) {
      console.error("❌ Error checking onboarding:", error);
      router.replace("/(auth)");
    } finally {
      setIsReady(true);
      await SplashScreen.hideAsync();
    }
  };

  if (!isReady) {
    return null;
  }

  return null;
}
