// app/(tabs)/profile.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, signOut, sendPartnerInvite } = useAuth();
  const { theme } = useTheme();
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState('');

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

  const handleInvitePartner = async () => {
    if (!partnerEmail.trim()) {
      Alert.alert('Error', 'Please enter your partner\'s email');
      return;
    }

    const result = await sendPartnerInvite(partnerEmail.trim());
    
    if (result.error) {
      Alert.alert('Error', result.error.message || 'Failed to send invite');
    } else {
      Alert.alert('Success', 'Partner invite sent!');
      setInviteModalVisible(false);
      setPartnerEmail('');
    }
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
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
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Ionicons name="person-circle" size={80} color={theme.colors.primary} />
          </View>
          <Text style={styles.userName}>{profile?.display_name}</Text>
          <Text style={styles.userEmail}>{profile?.email}</Text>
        </View>

        {/* Theme Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <ThemeSwitcher />
        </View>

        {/* Couple Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relationship Status</Text>
          {profile?.couple_id ? (
            <View style={styles.connectedCard}>
              <Ionicons name="heart" size={24} color={theme.colors.primary} />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          ) : (
            <>
              <Text style={styles.notConnectedText}>
                Not connected to a partner yet
              </Text>
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => setInviteModalVisible(true)}
              >
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={styles.inviteButtonText}>Invite Partner</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="lock-closed-outline" size={24} color={theme.colors.secondary} />
              <Text style={styles.settingText}>Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={24} color={theme.colors.accent} />
              <Text style={styles.settingText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="information-circle-outline" size={24} color={theme.colors.nav2} />
              <Text style={styles.settingText}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Invite Partner Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={inviteModalVisible}
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Your Partner</Text>
              <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter your partner's email address to send them an invitation to connect
            </Text>

            <TextInput
              style={styles.emailInput}
              placeholder="Partner's email"
              value={partnerEmail}
              onChangeText={setPartnerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.colors.textLight}
            />

            <TouchableOpacity
              style={styles.sendInviteButton}
              onPress={handleInvitePartner}
            >
              <Text style={styles.sendInviteButtonText}>Send Invite</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  headerRight: {
    width: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: theme.colors.cardBackground,
  },
  avatar: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
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
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  connectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.borderLight,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  connectedText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
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
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
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
  settingText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.error,
    gap: 8,
    backgroundColor: theme.colors.cardBackground,
  },
  signOutText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
  },
  sendInviteButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendInviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});