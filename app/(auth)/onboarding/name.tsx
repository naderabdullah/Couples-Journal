// app/(auth)/onboarding/name.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function NameScreen() {
  const { setDisplayName } = useOnboarding();
  const { theme } = useTheme();
  const [name, setName] = useState('');

  // Bouncing heart animation
  const heartScale = useSharedValue(1);

  useState(() => {
    heartScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  });

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const handleContinue = () => {
    if (name.trim().length >= 2) {
      setDisplayName(name.trim());
      router.push('/(auth)/onboarding/avatar');
    }
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, styles.progressDotInactive]} />
            <View style={[styles.progressDot, styles.progressDotInactive]} />
            <View style={[styles.progressDot, styles.progressDotInactive]} />
            <View style={[styles.progressDot, styles.progressDotInactive]} />
          </View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emojiContainer}>
            <Animated.Text style={[styles.emoji, heartStyle]}>💕</Animated.Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <Text style={styles.title}>What's your name?</Text>
            <Text style={styles.subtitle}>Let's start with something simple!</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter your name..."
              placeholderTextColor={theme.colors.textLight}
              value={name}
              onChangeText={setName}
              autoFocus
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={handleContinue}
            />
            {name.length > 0 && name.length < 2 && (
              <Text style={styles.errorText}>Name must be at least 2 characters</Text>
            )}
          </Animated.View>

          {/* Encouraging message */}
          {name.trim().length >= 2 && (
            <Animated.View entering={FadeInUp.springify()} style={styles.encouragementContainer}>
              <Text style={styles.encouragement}>
                Nice to meet you, {name}! 👋
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        <Animated.View entering={FadeInUp.delay(800).springify()} style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.continueButton, name.trim().length < 2 && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={name.trim().length < 2}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.stepText}>Step 1 of 5</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 140, // Space for bottom container
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  progressDotInactive: {
    backgroundColor: theme.colors.border,
  },
  emojiContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  emoji: {
    fontSize: 100,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 20,
    padding: 20,
    fontSize: 20,
    backgroundColor: theme.colors.cardBackground,
    textAlign: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    color: theme.colors.text,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  encouragementContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  encouragement: {
    fontSize: 18,
    color: theme.colors.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    paddingBottom: 20,
    paddingTop: 12,
    gap: 12,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepText: {
    textAlign: 'center',
    color: theme.colors.textLight,
    fontSize: 14,
  },
});