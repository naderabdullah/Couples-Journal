// app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

// Loading screen
function LoadingScreen() {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading...</Text>
    </View>
  );
}

// Main navigation logic
function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Still loading, don't navigate

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    debugLog('Navigation check', { 
      loading, 
      user: !!user, 
      inAuthGroup, 
      inTabsGroup,
      segments 
    });

    if (!user && !inAuthGroup) {
      // Not signed in and not in auth group, redirect to login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Signed in but still in auth group, redirect to tabs
      router.replace('/(tabs)');
    }
    // Otherwise, user is in the right place
  }, [user, segments, loading]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="(auth)" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false,
        }} 
      />
    </Stack>
  );
}

const debugLog = (message: string, data?: any) => {
  if (__DEV__) {
    console.log(`[Navigation] ${message}`, data || '');
  }
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});