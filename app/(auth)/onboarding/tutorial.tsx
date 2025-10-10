// app/(auth)/onboarding/tutorial.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInRight,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '📅',
    title: 'Plan Together',
    description: 'Share your calendar and never miss a date night or important moment.',
    gradient: ['#EC4899', '#F472B6'] as const,
    icon: 'calendar',
  },
  {
    id: '2',
    emoji: '💕',
    title: 'Stay Connected',
    description: 'Answer daily questions and share gratitude to deepen your bond.',
    gradient: ['#8B5CF6', '#A78BFA'] as const,
    icon: 'heart',
  },
  {
    id: '3',
    emoji: '📸',
    title: 'Capture Memories',
    description: 'Create beautiful memory collections with photos, journals, and voice notes.',
    gradient: ['#3B82F6', '#60A5FA'] as const,
    icon: 'images',
  },
];

export default function TutorialScreen() {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      // Last slide - go to credentials
      router.push('/(auth)/onboarding/credentials');
    }
  };

  const handleSkip = () => {
    router.push('/(auth)/onboarding/credentials');
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={[styles.slide, { width }]}>
      <Animated.View 
        entering={FadeInDown.delay(200).springify()}
        style={styles.emojiContainer}
      >
        <LinearGradient
          colors={item.gradient}
          style={styles.emojiCircle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.emoji}>{item.emoji}</Text>
        </LinearGradient>
      </Animated.View>

      <Animated.View 
        entering={FadeInRight.delay(400).springify()}
        style={styles.contentContainer}
      >
        <Text style={[styles.slideTitle, { color: theme.colors.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.slideDescription, { color: theme.colors.textSecondary }]}>
          {item.description}
        </Text>

        {/* Feature highlight */}
        <View style={styles.featureContainer}>
          <View style={[
            styles.featureItem, 
            { 
              borderColor: item.gradient[0],
              backgroundColor: theme.colors.cardBackground,
            }
          ]}>
            <Ionicons name={item.icon as any} size={24} color={item.gradient[0]} />
            <Text style={[styles.featureText, { color: item.gradient[0] }]}>
              {item.icon === 'calendar' && 'Shared Events'}
              {item.icon === 'heart' && 'Daily Questions'}
              {item.icon === 'images' && 'Memory Albums'}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, styles.progressDotComplete]} />
        <View style={[styles.progressDot, styles.progressDotComplete]} />
        <View style={[styles.progressDot, styles.progressDotComplete]} />
        <View style={styles.progressDot} />
        <View style={[styles.progressDot, styles.progressDotInactive]} />
      </View>

      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        bounces={false}
      />

      {/* Bottom navigation */}
      <View style={styles.bottomContainer}>
        {/* Page indicators */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Next button */}
        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: SLIDES[currentIndex].gradient[0] },
          ]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === SLIDES.length - 1 ? 'Almost There!' : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.stepText}>Step 4 of 5</Text>
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
  skipButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 12,
  },
  skipText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiContainer: {
    marginBottom: 40,
  },
  emojiCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  emoji: {
    fontSize: 70,
  },
  contentContainer: {
    alignItems: 'center',
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  slideDescription: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  featureContainer: {
    marginTop: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 10,
    borderWidth: 2,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomContainer: {
    paddingHorizontal: 30,
    paddingBottom: 40,
    gap: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: theme.colors.primary,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    padding: 18,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonText: {
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