// app/(auth)/onboarding/avatar.tsx - WITH LIGHT THEME FORCED
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
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
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { themes } from '../../../constants/themes';
import { useOnboarding } from '../../../contexts/OnboardingContext';

const { width } = Dimensions.get('window');

const AVATAR_EMOJIS = [
  '😊', '😎', '🥰', '😇', '🤗', '😋',
  '🥳', '😍', '🤩', '🌟', '💖', '🌈',
  '🦄', '🐱', '🐶', '🐼', '🦊', '🐨',
  '🌸', '🌺', '🌻', '🌹', '💐', '🌷',
];

export default function AvatarScreen() {
  const { data, setAvatarUrl } = useOnboarding();
  // Force light theme for this page
  const theme = themes.light;
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Animated values for the floating hearts
  const heart1 = useSharedValue(0);
  const heart2 = useSharedValue(0);
  const heart3 = useSharedValue(0);

  useEffect(() => {
    // Animate floating hearts
    heart1.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );
    heart2.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 2500 }),
        withTiming(0, { duration: 2500 })
      ),
      -1,
      true
    );
    heart3.value = withRepeat(
      withSequence(
        withTiming(-25, { duration: 1800 }),
        withTiming(0, { duration: 1800 })
      ),
      -1,
      true
    );
  }, []);

  const heart1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: heart1.value }],
  }));

  const heart2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: heart2.value }],
  }));

  const heart3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: heart3.value }],
  }));

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUploadedImage(result.assets[0].uri);
      setSelectedAvatar(null);
    }
  };

  const handleContinue = () => {
    if (uploadedImage) {
      setAvatarUrl(uploadedImage);
    } else if (selectedAvatar) {
      setAvatarUrl(selectedAvatar);
    }
    router.push('/(auth)/onboarding/theme');
  };

  const handleSkip = () => {
    router.push('/(auth)/onboarding/theme');
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress indicator - Step 2 of 6 */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, styles.progressDotComplete]} />
        <View style={styles.progressDot} />
        <View style={[styles.progressDot, styles.progressDotInactive]} />
        <View style={[styles.progressDot, styles.progressDotInactive]} />
        <View style={[styles.progressDot, styles.progressDotInactive]} />
        <View style={[styles.progressDot, styles.progressDotInactive]} />
      </View>

      {/* Floating hearts background */}
      <Animated.View style={[styles.floatingHeart, styles.heart1, heart1Style]}>
        <Text style={styles.heartEmoji}>💕</Text>
      </Animated.View>
      <Animated.View style={[styles.floatingHeart, styles.heart2, heart2Style]}>
        <Text style={styles.heartEmoji}>💖</Text>
      </Animated.View>
      <Animated.View style={[styles.floatingHeart, styles.heart3, heart3Style]}>
        <Text style={styles.heartEmoji}>💗</Text>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.header}>
          <Text style={styles.emoji}>🎨</Text>
          <Text style={styles.title}>Choose Your Avatar!</Text>
          <Text style={styles.subtitle}>
            Pick an emoji or upload your photo
          </Text>
        </Animated.View>

        {/* Current Selection Preview */}
        <Animated.View 
          entering={FadeIn.delay(400).springify()} 
          style={styles.previewContainer}
        >
          <View style={styles.previewCircle}>
            {uploadedImage ? (
              <Image source={{ uri: uploadedImage }} style={styles.previewImage} />
            ) : selectedAvatar ? (
              <Text style={styles.previewEmoji}>{selectedAvatar}</Text>
            ) : (
              <Ionicons name="person" size={60} color={theme.colors.border} />
            )}
          </View>
          <Text style={styles.previewText}>
            {data.displayName || 'You'}
          </Text>
        </Animated.View>

        {/* Upload Photo Button */}
        <Animated.View entering={FadeInDown.delay(600).springify()}>
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Ionicons name="camera" size={24} color={theme.colors.primary} />
            <Text style={styles.uploadButtonText}>Upload Photo</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Divider */}
        <Animated.View entering={FadeInDown.delay(700).springify()} style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or choose an emoji</Text>
          <View style={styles.dividerLine} />
        </Animated.View>

        {/* Emoji Grid */}
        <Animated.View entering={FadeInDown.delay(800).springify()} style={styles.emojiGrid}>
          {AVATAR_EMOJIS.map((emoji, index) => (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.emojiButton,
                selectedAvatar === emoji && styles.emojiButtonSelected,
              ]}
              onPress={() => {
                setSelectedAvatar(emoji);
                setUploadedImage(null);
              }}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </ScrollView>

      {/* Bottom Actions */}
      <Animated.View entering={FadeInUp.delay(1000).springify()} style={styles.bottomActions}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedAvatar && !uploadedImage) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedAvatar && !uploadedImage}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.stepText}>Step 2 of 6</Text>
      </Animated.View>
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
  floatingHeart: {
    position: 'absolute',
    zIndex: 0,
  },
  heart1: {
    top: 100,
    left: 30,
  },
  heart2: {
    top: 200,
    right: 40,
  },
  heart3: {
    top: 400,
    left: 50,
  },
  heartEmoji: {
    fontSize: 40,
    opacity: 0.3,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 180,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
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
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  previewCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 4,
    borderColor: theme.colors.borderLight,
  },
  previewImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  previewEmoji: {
    fontSize: 60,
  },
  previewText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  emojiButton: {
    width: (width - 80) / 6,
    height: (width - 80) / 6,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  emojiButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.borderLight,
    transform: [{ scale: 1.1 }],
  },
  emojiText: {
    fontSize: 32,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
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
  continueButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonDisabled: {
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