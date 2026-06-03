import { Stack } from 'expo-router';
import { OnboardingProvider } from './_context/OnboardingContext';
import { useEffect } from 'react';
import { track } from '../../utils/analytics';

/**
 * Onboarding layout with Stack navigator and Context Provider
 * Wraps all onboarding screens with shared state
 */
export default function OnboardingLayout() {
  useEffect(() => {
    track('onboarding_started');
  }, []);

  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="step1" />
        <Stack.Screen name="step2" />
      </Stack>
    </OnboardingProvider>
  );
}
