// app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
  const { user, loading: authLoading } = useAuth();
  const { loading: themeLoading, themeName } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  const loading = authLoading || themeLoading;

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isLoginOrRegister = segments[1] === 'login' || segments[1] === 'register';

    debugLog('Navigation check', { 
      loading, 
      user: !!user, 
      inAuthGroup, 
      isLoginOrRegister,
      segments 
    });

    if (!user && !inAuthGroup) {
      // Not signed in and not in auth group, redirect to login
      router.replace('/(auth)/login');
    } else if (user && isLoginOrRegister) {
      // Signed in but on login/register page, redirect to tabs
      router.replace('/(tabs)');
    }
    // Otherwise, let them stay wherever they are
  }, [user, segments, loading]);

  if (loading) {
    return <LoadingScreen />;
  }

  // StatusBar style based on theme
  const statusBarStyle = themeName === 'dark' ? 'light' : 'dark';

  return (
    <>
      <StatusBar style={statusBarStyle} />
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
    </>
  );
}

const debugLog = (message: string, data?: any) => {
  if (__DEV__) {
    console.log(`[Navigation] ${message}`, data || '');
  }
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootLayoutNav />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
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