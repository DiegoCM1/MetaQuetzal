import { Stack } from 'expo-router';
import { EducationalProvider } from './_context/EducationalContext';
import { useEffect } from 'react';
import { track } from '../../utils/analytics';

/**
 * Educational content layout with Stack navigator and Context Provider
 * Wraps all educational screens with shared state for favorites and history
 */
export default function EducationalLayout() {
  useEffect(() => {
    track('educational_section_entered');
  }, []);

  return (
    <EducationalProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="[noteId]"
          options={{
            presentation: 'card',
          }}
        />
      </Stack>
    </EducationalProvider>
  );
}
