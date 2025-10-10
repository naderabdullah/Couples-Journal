// app/(auth)/register.tsx
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function RegisterScreen() {
  // Redirect to onboarding flow
  useEffect(() => {
    router.replace('/(auth)/onboarding/name');
  }, []);

  return null;
}