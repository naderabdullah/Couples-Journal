// components/LoadingScreen.tsx - Beautiful loading component
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

interface LoadingScreenProps {
  message?: string;
  emoji?: string;
}

export function LoadingScreen({ 
  message = 'Loading...', 
  emoji = '💕' 
}: LoadingScreenProps) {
  const { theme } = useTheme();

  // Animated values
  const emojiScale = useSharedValue(1);
  const emojiRotate = useSharedValue(0);
  const heartScale = useSharedValue(1);
  const sparkleOpacity = useSharedValue(0);

  useEffect(() => {
    // Main emoji pulse
    emojiScale.value = withRepeat(
      withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 8 })
      ),
      -1,
      true
    );

    // Subtle rotation
    emojiRotate.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 1000 }),
        withTiming(-5, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1,
      true
    );

    // Heart beat
    heartScale.value = withRepeat(
      withSequence(
        withSpring(1.3),
        withSpring(1)
      ),
      -1,
      true
    );

    // Sparkle twinkle
    sparkleOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: emojiScale.value },
      { rotate: `${emojiRotate.value}deg` }
    ],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
  }));

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.cardBackground]}
        style={styles.gradient}
      >
        {/* Background sparkles */}
        <View style={styles.sparklesContainer}>
          <Animated.Text style={[styles.sparkle, styles.sparkle1, sparkleStyle]}>
            ✨
          </Animated.Text>
          <Animated.Text style={[styles.sparkle, styles.sparkle2, sparkleStyle]}>
            ⭐
          </Animated.Text>
          <Animated.Text style={[styles.sparkle, styles.sparkle3, sparkleStyle]}>
            💫
          </Animated.Text>
          <Animated.Text style={[styles.sparkle, styles.sparkle4, sparkleStyle]}>
            ✨
          </Animated.Text>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Animated emoji */}
          <Animated.Text style={[styles.mainEmoji, emojiStyle]}>
            {emoji}
          </Animated.Text>

          {/* Loading spinner with gradient background */}
          <View style={styles.spinnerContainer}>
            <LinearGradient
              colors={[theme.colors.primary + '20', theme.colors.secondary + '20']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.spinnerGradient}
            >
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </LinearGradient>
          </View>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Animated hearts */}
          <View style={styles.heartsContainer}>
            <Animated.Text style={[styles.heart, heartStyle]}>
              💖
            </Animated.Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparklesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 24,
  },
  sparkle1: {
    top: '20%',
    left: '15%',
  },
  sparkle2: {
    top: '30%',
    right: '20%',
  },
  sparkle3: {
    bottom: '25%',
    left: '25%',
  },
  sparkle4: {
    bottom: '35%',
    right: '15%',
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  mainEmoji: {
    fontSize: 80,
    marginBottom: 30,
  },
  spinnerContainer: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  spinnerGradient: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 10,
  },
  heartsContainer: {
    marginTop: 20,
  },
  heart: {
    fontSize: 32,
  },
});

// Simple Loading Spinner (for inline use)
export function LoadingSpinner({ size = 'large', color }: { size?: 'small' | 'large'; color?: string }) {
  const { theme } = useTheme();
  
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withSpring(1.2),
        withSpring(1)
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <ActivityIndicator size={size} color={color || theme.colors.primary} />
    </Animated.View>
  );
}