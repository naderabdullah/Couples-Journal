// app/(auth)/onboarding/connect.tsx - FINAL ONBOARDING STEP
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Clipboard,
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
import { useAuth } from '../../../contexts/AuthContext';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function ConnectScreen() {
  const { generateInviteCode, acceptInviteCode, getCurrentInviteCode } = useAuth();
  const { reset } = useOnboarding();
  const { theme } = useTheme();
  const [mode, setMode] = useState<'choose' | 'generate' | 'accept'>('choose');
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (!codeExpiry) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = codeExpiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        setGeneratedCode('');
        setCodeExpiry(null);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [codeExpiry]);

  const handleGenerateCode = async () => {
    try {
      setLoading(true);
      const { code, error } = await generateInviteCode();

      if (error) {
        Alert.alert('Error', error.message || 'Failed to generate code');
        return;
      }

      if (code) {
        setGeneratedCode(code);
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 1);
        setCodeExpiry(expiry);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptCode = async () => {
    try {
      if (!inviteCode.trim() || inviteCode.trim().length !== 6) {
        Alert.alert('Error', 'Please enter a valid 6-character code');
        return;
      }

      setLoading(true);
      const { success, error } = await acceptInviteCode(inviteCode);

      if (error) {
        Alert.alert('Error', error.message || 'Failed to accept invite');
        return;
      }

      if (success) {
        Alert.alert(
          'Success! 💕',
          'You are now connected with your partner!',
          [
            {
              text: 'OK',
              onPress: () => {
                reset();
                router.replace('/(tabs)');
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    Clipboard.setString(generatedCode);
    Alert.alert('Copied!', 'Code copied to clipboard');
  };

  const skipForNow = () => {
    Alert.alert(
      'Skip Partner Setup',
      'You can always connect with your partner later from the profile screen.',
      [
        { text: 'Stay Here', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: () => {
            reset();
            router.replace('/(tabs)');
          } 
        },
      ]
    );
  };

  const styles = createStyles(theme);

  if (mode === 'choose') {
    return (
      <SafeAreaView style={styles.container}>
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={styles.progressDot} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.header}>
            <Text style={styles.emoji}>💕</Text>
            <Text style={styles.title}>Connect with Your Partner</Text>
            <Text style={styles.subtitle}>
              Choose how you'd like to connect
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => {
                setMode('generate');
                handleGenerateCode();
              }}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="qr-code" size={40} color={theme.colors.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Generate a Code</Text>
                <Text style={styles.optionDescription}>
                  Create a code to share with your partner
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => setMode('accept')}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="key" size={40} color={theme.colors.secondary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Enter a Code</Text>
                <Text style={styles.optionDescription}>
                  Have a code from your partner? Enter it here
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.textLight} />
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.bottomContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={skipForNow}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
          <Text style={styles.stepText}>Step 6 of 6</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (mode === 'generate') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={styles.progressDot} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setMode('choose')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.emoji}>🔗</Text>
            <Text style={styles.title}>Share Your Code</Text>
            <Text style={styles.subtitle}>
              Share this code with your partner
            </Text>
          </View>

          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : generatedCode ? (
              <>
                <View style={styles.codeDisplay}>
                  <Text style={styles.codeLabel}>Your Connection Code</Text>
                  <View style={styles.codeBox}>
                    <Text style={styles.codeText}>{generatedCode}</Text>
                  </View>
                  <View style={styles.expiryContainer}>
                    <Ionicons name="time-outline" size={16} color="#F59E0B" />
                    <Text style={styles.expiryText}>
                      {timeRemaining === 'Expired' ? 'Expired' : `Expires in ${timeRemaining}`}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
                  <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.copyButtonText}>Copy Code</Text>
                </TouchableOpacity>

                <View style={styles.instructionsCard}>
                  <Text style={styles.instructionsTitle}>Next Steps:</Text>
                  <Text style={styles.instructionItem}>1. Share this code with your partner</Text>
                  <Text style={styles.instructionItem}>2. They can enter it in their app</Text>
                  <Text style={styles.instructionItem}>3. You'll be connected! 💕</Text>
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.bottomContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={skipForNow}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
          <Text style={styles.stepText}>Step 6 of 6</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Accept mode
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, styles.progressDotComplete]} />
        <View style={[styles.progressDot, styles.progressDotComplete]} />
        <View style={[styles.progressDot, styles.progressDotComplete]} />
        <View style={[styles.progressDot, styles.progressDotComplete]} />
        <View style={[styles.progressDot, styles.progressDotComplete]} />
        <View style={styles.progressDot} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode('choose')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.emoji}>🔑</Text>
          <Text style={styles.title}>Enter Code</Text>
          <Text style={styles.subtitle}>
            Enter the code your partner shared
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Connection Code</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="XXXXXX"
              placeholderTextColor={theme.colors.textLight}
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>
              The code is case-insensitive and expires after 1 hour
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.connectButton, (loading || inviteCode.trim().length !== 6) && styles.buttonDisabled]}
            onPress={handleAcceptCode}
            disabled={loading || inviteCode.trim().length !== 6}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="link" size={20} color="#fff" />
                <Text style={styles.connectButtonText}>Connect</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.skipButton} onPress={skipForNow}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
        <Text style={styles.stepText}>Step 6 of 6</Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  content: {
    gap: 20,
  },
  codeDisplay: {
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  codeLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    fontWeight: '500',
  },
  codeBox: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.primary,
    letterSpacing: 4,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  expiryText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '500',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.cardBackground,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  copyButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: theme.colors.borderLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  instructionItem: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    backgroundColor: theme.colors.inputBackground,
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  connectButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 8,
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  stepText: {
    textAlign: 'center',
    color: theme.colors.textLight,
    fontSize: 14,
  },
});