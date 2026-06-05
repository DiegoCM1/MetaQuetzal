import { Stack } from 'expo-router';

/**
 * Local chat layout with Stack navigator
 * Handles the offline/nearby chat prototype screen
 */
export default function LocalChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
