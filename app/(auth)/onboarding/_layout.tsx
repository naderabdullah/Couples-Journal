// app/(auth)/onboarding/_layout.tsx
import { Stack } from 'expo-router';
import { OnboardingProvider } from '../../../contexts/OnboardingContext';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="name" />
        <Stack.Screen name="avatar" />
        <Stack.Screen name="theme" />
        <Stack.Screen name="tutorial" />
        <Stack.Screen name="credentials" />
      </Stack>
    </OnboardingProvider>
  );
}