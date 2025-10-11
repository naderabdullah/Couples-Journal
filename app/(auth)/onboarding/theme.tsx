// app/(auth)/onboarding/theme.tsx - FIXED PROGRESS DOTS
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeName, themes } from '../../../constants/themes';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useTheme } from '../../../contexts/ThemeContext';

const THEME_OPTIONS = [
  {
    name: 'light' as ThemeName,
    title: 'Light & Bright',
    emoji: '☀️',
    description: 'Clean and cheerful',
  },
  {
    name: 'dark' as ThemeName,
    title: 'Dark Mode',
    emoji: '🌙',
    description: 'Easy on the eyes',
  },
  {
    name: 'blue' as ThemeName,
    title: 'Ocean Blue',
    emoji: '🌊',
    description: 'Cool and calming',
  },
  {
    name: 'pink' as ThemeName,
    title: 'Romantic Pink',
    emoji: '💖',
    description: 'Sweet and lovely',
  },
];

export default function ThemeScreen() {
  const { data, setTheme: setOnboardingTheme } = useOnboarding();
  const { theme, setTheme: setAppTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(data.theme || 'light');

  const handleThemeSelect = (themeName: ThemeName) => {
    setSelectedTheme(themeName);
    // APPLY THEME IMMEDIATELY
    setAppTheme(themeName);
    setOnboardingTheme(themeName);
  };

  const handleContinue = () => {
    // Theme is already applied, just navigate
    router.push('/(auth)/onboarding/tutorial');
  };

  const handleSkip = () => {
    setAppTheme('light'); // Default to light
    setOnboardingTheme('light');
    router.push('/(auth)/onboarding/tutorial');
  };

  const renderThemePreview = (themeName: ThemeName) => {
    const previewTheme = themes[themeName];
    return (
      <View style={styles.previewContainer}>
        {/* Mini app preview */}
        <View style={[styles.previewPhone, { backgroundColor: previewTheme.colors.background }]}>
          {/* Header */}
          <View style={[styles.previewHeader, { backgroundColor: previewTheme.colors.cardBackground }]}>
            <View style={[styles.previewIcon, { backgroundColor: previewTheme.colors.primary }]} />
            <View style={styles.previewHeaderText}>
              <View style={[styles.previewTextLine, { backgroundColor: previewTheme.colors.text, width: 60 }]} />
            </View>
          </View>
          
          {/* Content cards */}
          <View style={styles.previewContent}>
            <View style={[styles.previewCard, { backgroundColor: previewTheme.colors.cardBackground, borderColor: previewTheme.colors.border }]}>
              <View style={[styles.previewCircle, { backgroundColor: previewTheme.colors.primary }]} />
              <View style={[styles.previewTextLine, { backgroundColor: previewTheme.colors.text, width: 80 }]} />
              <View style={[styles.previewTextLine, { backgroundColor: previewTheme.colors.textSecondary, width: 100 }]} />
            </View>
            
            <View style={[styles.previewCard, { backgroundColor: previewTheme.colors.cardBackground, borderColor: previewTheme.colors.border }]}>
              <View style={[styles.previewCircle, { backgroundColor: previewTheme.colors.secondary }]} />
              <View style={[styles.previewTextLine, { backgroundColor: previewTheme.colors.text, width: 70 }]} />
              <View style={[styles.previewTextLine, { backgroundColor: previewTheme.colors.textSecondary, width: 90 }]} />
            </View>
          </View>
          
          {/* Bottom nav */}
          <View style={[styles.previewNav, { backgroundColor: previewTheme.colors.cardBackground, borderTopColor: previewTheme.colors.border }]}>
            <View style={[styles.previewNavItem, { backgroundColor: previewTheme.colors.primary }]} />
            <View style={[styles.previewNavItem, { backgroundColor: previewTheme.colors.border }]} />
            <View style={[styles.previewNavItem, { backgroundColor: previewTheme.colors.border }]} />
            <View style={[styles.previewNavItem, { backgroundColor: previewTheme.colors.border }]} />
          </View>
        </View>
      </View>
    );
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress indicator - Step 3 of 6 */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, styles.progressDotComplete]} />
        <View style={[styles.progressDot, styles.progressDotComplete]} />
        <View style={styles.progressDot} />
        <View style={[styles.progressDot, styles.progressDotInactive]} />
        <View style={[styles.progressDot, styles.progressDotInactive]} />
        <View style={[styles.progressDot, styles.progressDotInactive]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.header}>
          <Text style={styles.emoji}>🎨</Text>
          <Text style={styles.title}>Choose Your Vibe!</Text>
          <Text style={styles.subtitle}>
            Pick a theme that matches your style
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.themesContainer}>
          {THEME_OPTIONS.map((option, index) => {
            const isSelected = selectedTheme === option.name;
            const optionTheme = themes[option.name];
            
            return (
              <Animated.View
                key={option.name}
                entering={FadeInUp.delay(500 + index * 100).springify()}
              >
                <TouchableOpacity
                  style={[
                    styles.themeCard,
                    isSelected && styles.themeCardSelected,
                    { borderColor: isSelected ? optionTheme.colors.primary : theme.colors.border },
                  ]}
                  onPress={() => handleThemeSelect(option.name)}
                >
                  <View style={styles.themeCardHeader}>
                    <Text style={styles.themeEmoji}>{option.emoji}</Text>
                    <View style={styles.themeInfo}>
                      <Text style={styles.themeTitle}>{option.title}</Text>
                      <Text style={styles.themeDescription}>{option.description}</Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.checkmark, { backgroundColor: optionTheme.colors.primary }]}>
                        <Ionicons name="checkmark" size={20} color="#fff" />
                      </View>
                    )}
                  </View>
                  
                  {renderThemePreview(option.name)}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInUp.delay(900).springify()} style={styles.bottomContainer}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: themes[selectedTheme].colors.primary }]}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.stepText}>Step 3 of 6</Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 180,
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
  },
  themesContainer: {
    gap: 16,
  },
  themeCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  themeCardSelected: {
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  themeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  themeEmoji: {
    fontSize: 36,
    marginRight: 12,
  },
  themeInfo: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  themeDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    alignItems: 'center',
  },
  previewPhone: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  previewIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  previewHeaderText: {
    flex: 1,
  },
  previewTextLine: {
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  previewContent: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  previewCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  previewCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  previewNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderTopWidth: 1,
  },
  previewNavItem: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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