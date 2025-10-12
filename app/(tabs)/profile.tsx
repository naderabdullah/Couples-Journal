// app/(tabs)/profile.tsx - ENHANCED with animations and avatar display
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, signOut, generateInviteCode, acceptInviteCode, getCurrentInviteCode } = useAuth();
  const { theme } = useTheme();
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  
  const [inviteMode, setInviteMode] = useState<'choose' | 'generate' | 'accept'>('choose');
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);

  // Animated values for floating hearts
  const heartScale = useSharedValue(1);
  const avatarScale = useSharedValue(1);

  useEffect(() => {
    // Pulse animation for connected heart
    if (profile?.couple_id) {
      heartScale.value = withRepeat(
        withSequence(
          withSpring(1.2),
          withSpring(1)
        ),
        -1,
        true
      );
    }

    // Avatar entrance animation
    avatarScale.value = withSpring(1, { damping: 8 });
  }, [profile?.couple_id]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

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

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ],
      { cancelable: true }
    );
  };

  const loadExistingCode = async () => {
    const { code } = await getCurrentInviteCode();
    if (code) {
      setGeneratedCode(code.code);
      setCodeExpiry(new Date(code.expires_at));
      setInviteMode('generate');
    }
  };

  const openInviteModal = async () => {
    setInviteModalVisible(true);
    setInviteMode('choose');
    setInviteCode('');
    setGeneratedCode('');
    setCodeExpiry(null);
    await loadExistingCode();
  };

  const closeInviteModal = () => {
    setInviteModalVisible(false);
    setInviteMode('choose');
    setInviteCode('');
    setGeneratedCode('');
    setCodeExpiry(null);
  };

  const handleGenerateCode = async () => {
    try {
      setLoadingCode(true);
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
        setInviteMode('generate');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoadingCode(false);
    }
  };

  const handleAcceptCode = async () => {
    try {
      if (!inviteCode.trim() || inviteCode.trim().length !== 6) {
        Alert.alert('Error', 'Please enter a valid 6-character code');
        return;
      }

      setLoadingCode(true);
      const { success, error } = await acceptInviteCode(inviteCode);

      if (error) {
        Alert.alert('Error', error.message || 'Failed to accept invite');
        return;
      }

      if (success) {
        Alert.alert('Success! 💕', 'You are now connected with your partner!');
        closeInviteModal();
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoadingCode(false);
    }
  };

  const copyCodeToClipboard = () => {
    Clipboard.setString(generatedCode);
    Alert.alert('Copied!', 'Code copied to clipboard');
  };

  const renderAvatar = () => {
    const avatarUrl = profile?.avatar_url;
    
    // Check if it's an emoji (single character, likely emoji)
    const isEmoji = avatarUrl && avatarUrl.length <= 4;
    
    if (isEmoji) {
      return <Text style={styles.avatarEmoji}>{avatarUrl}</Text>;
    } else if (avatarUrl && avatarUrl.startsWith('http')) {
      return <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />;
    } else {
      return <Ionicons name="person-circle" size={100} color={theme.colors.primary} />;
    }
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
          
          <View style={styles.headerRight} />
        </Animated.View>

        {/* Profile Info with Avatar */}
        <Animated.View 
          entering={FadeIn.delay(200).springify()} 
          style={styles.profileSection}
        >
          <Animated.View style={[styles.avatarContainer, avatarStyle]}>
            {renderAvatar()}
          </Animated.View>
          <Animated.Text 
            entering={FadeInUp.delay(300).springify()} 
            style={styles.userName}
          >
            {profile?.display_name}
          </Animated.Text>
          <Animated.Text 
            entering={FadeInUp.delay(350).springify()} 
            style={styles.userEmail}
          >
            {profile?.email}
          </Animated.Text>
        </Animated.View>

        {/* Theme Selector */}
        <Animated.View 
          entering={FadeInUp.delay(400).springify()} 
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>✨ Appearance</Text>
          <ThemeSwitcher />
        </Animated.View>

        {/* Couple Status */}
        <Animated.View 
          entering={FadeInUp.delay(450).springify()} 
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>💕 Relationship Status</Text>
          {profile?.couple_id ? (
            <Animated.View style={heartStyle}>
              <View style={styles.connectedCard}>
                <Text style={styles.connectedEmoji}>💖</Text>
                <Text style={styles.connectedText}>Connected with your partner!</Text>
              </View>
            </Animated.View>
          ) : (
            <>
              <Text style={styles.notConnectedText}>
                Not connected to a partner yet
              </Text>
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={openInviteModal}
              >
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={styles.inviteButtonText}>Invite Partner</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        {/* Settings */}
        <Animated.View 
          entering={FadeInUp.delay(500).springify()} 
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>⚙️ Settings</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="notifications-outline" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.secondary + '20' }]}>
                <Ionicons name="lock-closed-outline" size={24} color={theme.colors.secondary} />
              </View>
              <Text style={styles.settingText}>Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.accent + '20' }]}>
                <Ionicons name="help-circle-outline" size={24} color={theme.colors.accent} />
              </View>
              <Text style={styles.settingText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.nav2 + '20' }]}>
                <Ionicons name="information-circle-outline" size={24} color={theme.colors.nav2} />
              </View>
              <Text style={styles.settingText}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
          </TouchableOpacity>
        </Animated.View>

        {/* Sign Out */}
        <Animated.View entering={FadeInUp.delay(550).springify()}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Invite Partner Modal - Keep existing modal code */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={inviteModalVisible}
        onRequestClose={closeInviteModal}
      >
        <SafeAreaView style={styles.modalFullScreen} edges={['top', 'bottom']}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {inviteMode === 'choose' ? 'Connect with Partner' : 
                 inviteMode === 'generate' ? 'Share Your Code' : 'Enter Code'}
              </Text>
              <TouchableOpacity onPress={closeInviteModal}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Keep existing modal content */}
              {inviteMode === 'choose' && (
                <View style={styles.inviteChooseContainer}>
                  <Text style={styles.modalDescription}>
                    Choose how you'd like to connect with your partner
                  </Text>

                  <TouchableOpacity
                    style={styles.inviteOptionCard}
                    onPress={() => {
                      setInviteMode('generate');
                      if (!generatedCode) {
                        handleGenerateCode();
                      }
                    }}
                  >
                    <View style={styles.inviteOptionIcon}>
                      <Ionicons name="qr-code" size={32} color={theme.colors.primary} />
                    </View>
                    <View style={styles.inviteOptionContent}>
                      <Text style={styles.inviteOptionTitle}>Generate Code</Text>
                      <Text style={styles.inviteOptionDesc}>
                        Create a code to share with your partner
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.inviteOptionCard}
                    onPress={() => setInviteMode('accept')}
                  >
                    <View style={styles.inviteOptionIcon}>
                      <Ionicons name="key" size={32} color={theme.colors.secondary} />
                    </View>
                    <View style={styles.inviteOptionContent}>
                      <Text style={styles.inviteOptionTitle}>Enter Code</Text>
                      <Text style={styles.inviteOptionDesc}>
                        Have a code from your partner? Enter it here
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
                  </TouchableOpacity>
                </View>
              )}

              {inviteMode === 'generate' && (
                <View style={styles.inviteGenerateContainer}>
                  <TouchableOpacity 
                    onPress={() => {
                      setInviteMode('choose');
                      setGeneratedCode('');
                      setCodeExpiry(null);
                    }}
                    style={styles.backButtonInline}
                  >
                    <Ionicons name="arrow-back" size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>

                  {!generatedCode ? (
                    <>
                      <Text style={styles.modalDescription}>
                        Generate a temporary code that your partner can use to connect with you. The code expires in 1 hour.
                      </Text>

                      <TouchableOpacity
                        style={styles.generateCodeButton}
                        onPress={handleGenerateCode}
                        disabled={loadingCode}
                      >
                        {loadingCode ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="add-circle" size={20} color="#fff" />
                            <Text style={styles.generateCodeButtonText}>Generate Code</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={styles.codeDisplayCard}>
                        <Text style={styles.codeLabel}>Your Connection Code</Text>
                        <View style={styles.codeBox}>
                          <Text style={styles.codeText}>{generatedCode}</Text>
                        </View>
                        <View style={styles.codeExpiry}>
                          <Ionicons name="time-outline" size={16} color="#F59E0B" />
                          <Text style={styles.codeExpiryText}>
                            {timeRemaining === 'Expired' ? 'Expired' : `Expires in ${timeRemaining}`}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.copyCodeButton}
                        onPress={copyCodeToClipboard}
                      >
                        <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.copyCodeButtonText}>Copy Code</Text>
                      </TouchableOpacity>

                      <View style={styles.codeInstructions}>
                        <Text style={styles.codeInstructionsTitle}>How to use:</Text>
                        <Text style={styles.codeInstructionsText}>
                          1. Share this code with your partner{'\n'}
                          2. They can enter it in their app{'\n'}
                          3. You'll be connected automatically! 💕
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.regenerateButton}
                        onPress={handleGenerateCode}
                        disabled={loadingCode}
                      >
                        {loadingCode ? (
                          <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                        ) : (
                          <>
                            <Ionicons name="refresh" size={18} color={theme.colors.textSecondary} />
                            <Text style={styles.regenerateButtonText}>Generate New Code</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              {inviteMode === 'accept' && (
                <View style={styles.inviteAcceptContainer}>
                  <TouchableOpacity 
                    onPress={() => setInviteMode('choose')}
                    style={styles.backButtonInline}
                  >
                    <Ionicons name="arrow-back" size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>

                  <Text style={styles.modalDescription}>
                    Enter the 6-character code your partner shared with you
                  </Text>

                  <View style={styles.codeInputContainer}>
                    <Text style={styles.codeInputLabel}>Connection Code</Text>
                    <TextInput
                      style={styles.codeInput}
                      placeholder="XXXXXX"
                      value={inviteCode}
                      onChangeText={(text) => setInviteCode(text.toUpperCase())}
                      maxLength={6}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      placeholderTextColor={theme.colors.textLight}
                    />
                    <Text style={styles.codeInputHelper}>
                      The code is case-insensitive and expires after 1 hour
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.acceptCodeButton,
                      (loadingCode || inviteCode.trim().length !== 6) && styles.acceptCodeButtonDisabled
                    ]}
                    onPress={handleAcceptCode}
                    disabled={loadingCode || inviteCode.trim().length !== 6}
                  >
                    {loadingCode ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="link" size={20} color="#fff" />
                        <Text style={styles.acceptCodeButtonText}>Connect</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  headerRight: {
    width: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: theme.colors.cardBackground,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 4,
    borderColor: theme.colors.border,
  },
  avatarEmoji: {
    fontSize: 60,
  },
  avatarImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  connectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.borderLight,
    padding: 20,
    borderRadius: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  connectedEmoji: {
    fontSize: 32,
  },
  connectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    flex: 1,
  },
  notConnectedText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  inviteButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.error,
    gap: 8,
    backgroundColor: theme.colors.cardBackground,
  },
  signOutText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles (keep existing)
  modalFullScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalContent: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  modalDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  inviteChooseContainer: {
    gap: 12,
  },
  inviteOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inviteOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inviteOptionContent: {
    flex: 1,
  },
  inviteOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  inviteOptionDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  inviteGenerateContainer: {
    gap: 16,
  },
  inviteAcceptContainer: {
    gap: 16,
  },
  backButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  generateCodeButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  generateCodeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  codeDisplayCard: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  codeLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    fontWeight: '500',
  },
  codeBox: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    letterSpacing: 4,
  },
  codeExpiry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  codeExpiryText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  copyCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.cardBackground,
  },
  copyCodeButtonText: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  codeInstructions: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  codeInstructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  codeInstructionsText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.inputBackground,
  },
  regenerateButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  codeInputContainer: {
    gap: 8,
  },
  codeInputLabel: {
    fontSize: 14,
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
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: 'bold',
  },
  codeInputHelper: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  acceptCodeButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  acceptCodeButtonDisabled: {
    opacity: 0.5,
  },
  acceptCodeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});