// app/(auth)/couple-setup.tsx - UPDATED with loading state
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
import { useAuth } from '../../contexts/AuthContext';

export default function CoupleSetupScreen() {
  const { generateInviteCode, acceptInviteCode, getCurrentInviteCode, profile, user } = useAuth();
  const [mode, setMode] = useState<'choose' | 'generate' | 'accept'>('choose');
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [initializing, setInitializing] = useState(true);

  // Wait for user and profile to load
  useEffect(() => {
    console.log('Couple setup - checking auth state:', { 
      hasUser: !!user, 
      hasProfile: !!profile,
      coupleId: profile?.couple_id 
    });

    if (user && profile) {
      console.log('User and profile loaded');
      setInitializing(false);
      loadExistingCode();
    } else if (user && !profile) {
      console.log('User exists but profile loading...');
      // User exists but profile is still loading
      const timeout = setTimeout(() => {
        console.log('Profile load timeout, continuing anyway');
        setInitializing(false);
      }, 5000); // Give it 5 seconds max
      return () => clearTimeout(timeout);
    } else if (!user) {
      console.log('No user yet, waiting...');
      // No user yet - wait a bit longer
      const timeout = setTimeout(() => {
        console.log('User load timeout');
        setInitializing(false);
        // If still no user after timeout, show error
        if (!user) {
          Alert.alert(
            'Session Error',
            'Unable to load your session. Please try logging in again.',
            [
              {
                text: 'Go to Login',
                onPress: () => router.replace('/(auth)/login'),
              },
            ]
          );
        }
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [user, profile]);

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

  const loadExistingCode = async () => {
    if (!user) return;
    const { code } = await getCurrentInviteCode();
    if (code) {
      setGeneratedCode(code.code);
      setCodeExpiry(new Date(code.expires_at));
      setMode('generate');
    }
  };

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
              onPress: () => router.replace('/(tabs)'),
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
      'You can always connect with your partner later from the profile screen. Continue to the app?',
      [
        { text: 'Stay Here', style: 'cancel' },
        { text: 'Continue', onPress: () => router.replace('/(tabs)') },
      ]
    );
  };

  // Show loading while waiting for user/profile to load
  if (initializing || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EC4899" />
        <Text style={styles.loadingText}>Setting up your account...</Text>
      </View>
    );
  }

  // Rest of your existing code...
  if (mode === 'choose') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.emoji}>💕</Text>
          <Text style={styles.title}>Connect with Your Partner</Text>
          <Text style={styles.subtitle}>
            Welcome, {profile?.display_name}! Choose how you'd like to connect
          </Text>
        </View>

        <View style={styles.content}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setMode('generate')}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="qr-code" size={40} color="#EC4899" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Generate a Code</Text>
              <Text style={styles.optionDescription}>
                Create a code to share with your partner
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setMode('accept')}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="key" size={40} color="#8B5CF6" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Enter a Code</Text>
              <Text style={styles.optionDescription}>
                Have a code from your partner? Enter it here
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={skipForNow}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (mode === 'generate') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => setMode('choose')} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#2D3748" />
          </TouchableOpacity>
          <Text style={styles.emoji}>🔗</Text>
          <Text style={styles.title}>Share Your Code</Text>
          <Text style={styles.subtitle}>
            Generate a code for your partner to connect with you
          </Text>
        </View>

        <View style={styles.content}>
          {!generatedCode ? (
            <View style={styles.generateContainer}>
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={24} color="#3B82F6" />
                <Text style={styles.infoText}>
                  Your code will be valid for 1 hour. Share it with your partner so they can connect with you.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleGenerateCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Generate Code</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.codeContainer}>
              <View style={styles.codeDisplay}>
                <Text style={styles.codeLabel}>Your Connection Code</Text>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{generatedCode}</Text>
                </View>
                <View style={styles.expiryContainer}>
                  <Ionicons name="time-outline" size={16} color="#F59E0B" />
                  <Text style={styles.expiryText}>
                    {timeRemaining === 'Expired' ? 'Code expired' : `Expires in ${timeRemaining}`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.copyButton}
                onPress={copyToClipboard}
              >
                <Ionicons name="copy-outline" size={20} color="#8B5CF6" />
                <Text style={styles.copyButtonText}>Copy Code</Text>
              </TouchableOpacity>

              <View style={styles.instructionsCard}>
                <Text style={styles.instructionsTitle}>Next Steps:</Text>
                <View style={styles.instructionsList}>
                  <Text style={styles.instructionItem}>
                    1. Share this code with your partner
                  </Text>
                  <Text style={styles.instructionItem}>
                    2. They can enter it in their app
                  </Text>
                  <Text style={styles.instructionItem}>
                    3. Once they enter it, you'll be connected! 💕
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleGenerateCode}
              >
                <Ionicons name="refresh" size={20} color="#718096" />
                <Text style={styles.secondaryButtonText}>Generate New Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // Accept code mode
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => setMode('choose')} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.emoji}>🔑</Text>
        <Text style={styles.title}>Enter Code</Text>
        <Text style={styles.subtitle}>
          Enter the code your partner shared with you
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Connection Code</Text>
          <TextInput
            style={styles.codeInput}
            placeholder="Enter 6-character code"
            value={inviteCode}
            onChangeText={(text) => setInviteCode(text.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.helperText}>
            The code is case-insensitive and expires after 1 hour
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, (loading || inviteCode.trim().length !== 6) && styles.buttonDisabled]}
          onPress={handleAcceptCode}
          disabled={loading || inviteCode.trim().length !== 6}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="link" size={20} color="#fff" />
              <Text style={styles.buttonText}>Connect</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color="#10B981" />
          <Text style={styles.infoText}>
            Once you connect, you'll be able to share your journal, memories, and calendar with your partner.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFBF7',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#718096',
    marginTop: 16,
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#FFFBF7',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F7FAFC',
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
    color: '#2D3748',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
  generateContainer: {
    gap: 20,
  },
  codeContainer: {
    gap: 20,
  },
  codeDisplay: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  codeLabel: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 12,
    fontWeight: '500',
  },
  codeBox: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderWidth: 2,
    borderColor: '#EC4899',
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#EC4899',
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
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  copyButtonText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
  },
  instructionsList: {
    gap: 8,
  },
  instructionItem: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    backgroundColor: '#fff',
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#EC4899',
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: {
    color: '#718096',
    fontSize: 16,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  skipButtonText: {
    color: '#718096',
    fontSize: 16,
    fontWeight: '500',
  },
});