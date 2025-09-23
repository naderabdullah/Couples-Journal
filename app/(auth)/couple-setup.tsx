import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';

const inviteSchema = z.object({
  partnerEmail: z.string().email('Please enter a valid email address'),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function CoupleSetupScreen() {
  const { sendPartnerInvite, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      partnerEmail: '',
    },
  });

  const onSubmit = async (data: InviteForm) => {
    try {
      setLoading(true);
      const { error } = await sendPartnerInvite(data.partnerEmail);
      
      if (error) {
        Alert.alert('Error', error.message || 'Failed to send invite');
        return;
      }

      Alert.alert(
        'Invite Sent!',
        'Your partner will need to accept the invitation to start sharing your journey together.',
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
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const skipForNow = () => {
    Alert.alert(
      'Skip Partner Setup',
      'You can always invite your partner later from the profile screen. Continue to the app?',
      [
        { text: 'Stay Here', style: 'cancel' },
        { text: 'Continue', onPress: () => router.replace('/(tabs)') },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>💕</Text>
        <Text style={styles.title}>Connect with Your Partner</Text>
        <Text style={styles.subtitle}>
          Invite your partner to start sharing your love story together
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>
            Welcome, {profile?.display_name}! 👋
          </Text>
          <Text style={styles.welcomeSubtext}>
            To get the most out of your couples journal, invite your partner to join you.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Invite Your Partner</Text>
          
          <Controller
            control={control}
            name="partnerEmail"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Partner's Email</Text>
                <TextInput
                  style={[styles.input, errors.partnerEmail && styles.inputError]}
                  placeholder="partner@email.com"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.partnerEmail && (
                  <Text style={styles.errorText}>{errors.partnerEmail.message}</Text>
                )}
                <Text style={styles.helperText}>
                  They'll need to create an account first if they haven't already.
                </Text>
              </View>
            )}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending Invite...' : 'Send Invitation'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.skipButton} onPress={skipForNow}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What happens next?</Text>
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>• Your partner receives an invitation</Text>
            <Text style={styles.infoItem}>• They create an account (if needed)</Text>
            <Text style={styles.infoItem}>• Once they accept, you can start sharing!</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
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
  },
  content: {
    flex: 1,
  },
  welcomeCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
  form: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 20,
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
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F7FAFC',
  },
  inputError: {
    borderColor: '#E53E3E',
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 14,
    marginTop: 4,
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
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#718096',
    fontSize: 14,
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 30,
  },
  skipButtonText: {
    color: '#718096',
    fontSize: 16,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
});