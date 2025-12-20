import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { track } from '../../utils/analytics';

/**
 * Subscription layout with Stack navigator
 * Handles subscription flow screens
 */
export default function SubscriptionLayout() {
  useEffect(() => {
    track('subscription_section_entered');
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="manage" />
    </Stack>
  );
}
