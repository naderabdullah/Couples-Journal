// app/(auth)/onboarding/credentials.tsx
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    Alert,
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
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { useAuth } from '../../../contexts/AuthContext';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useTheme } from '../../../contexts/ThemeContext';

const credentialsSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CredentialsForm = z.infer<typeof credentialsSchema>;

export default function CredentialsScreen() {
  const { signUp } = useAuth();
  const { theme, setTheme: setAppTheme } = useTheme();
  const { data, setCredentials, reset } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (formData: CredentialsForm) => {
    try {
      setLoading(true);
      
      // Store credentials in onboarding context
      setCredentials(formData.email, formData.password);
      
      // Apply the selected theme
      setAppTheme(data.theme);
      
      // Create the account with all the collected data
      const { error } = await signUp(
        formData.email, 
        formData.password, 
        data.displayName
      );
      
      if (error) {
        Alert.alert('Error', error.message || 'Failed to create account');
        return;
      }

      // Wait a moment for auth state to update
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success! Show celebration and go to couple setup
      Alert.alert(
        '🎉 Welcome!',
        `Great to have you, ${data.displayName}!`,
        [
          {
            text: 'Continue',
            onPress: () => {
              reset(); // Clear onboarding data
              router.replace('/(auth)/couple-setup');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={styles.progressDot} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.header}>
            <Text style={styles.emoji}>🎉</Text>
            <Text style={styles.title}>Almost Done!</Text>
            <Text style={styles.subtitle}>
              Just need your email and a password to secure your account
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="your@email.com"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor={theme.colors.textLight}
                  />
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                      placeholder="Create a secure password"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      placeholderTextColor={theme.colors.textLight}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={24}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.password && (
                    <Text style={styles.errorText}>{errors.password.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={[styles.input, errors.confirmPassword && styles.inputError]}
                    placeholder="Confirm your password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    placeholderTextColor={theme.colors.textLight}
                  />
                  {errors.confirmPassword && (
                    <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
                  )}
                </View>
              )}
            />

            {/* Summary of what they've entered */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Your Profile</Text>
              <View style={styles.summaryRow}>
                <Ionicons name="person" size={20} color={theme.colors.primary} />
                <Text style={styles.summaryText}>{data.displayName}</Text>
              </View>
              {data.avatarUrl && (
                <View style={styles.summaryRow}>
                  <Ionicons name="image" size={20} color={theme.colors.secondary} />
                  <Text style={styles.summaryText}>Avatar selected</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Ionicons name="color-palette" size={20} color={theme.colors.accent} />
                <Text style={styles.summaryText}>
                  {data.theme.charAt(0).toUpperCase() + data.theme.slice(1)} theme
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.createButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? 'Creating Account...' : 'Create My Account! 🚀'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.stepText}>Step 5 of 5</Text>
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
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 20,
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
  progressDotComplete: {
    backgroundColor: theme.colors.success,
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  input: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: theme.colors.borderLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    gap: 12,
    marginTop: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  bottomContainer: {
    paddingHorizontal: 30,
    paddingBottom: 20,
    gap: 12,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
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