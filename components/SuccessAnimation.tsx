// components/SuccessAnimation.tsx - Celebration component for successful actions
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

interface SuccessAnimationProps {
  visible: boolean;
  onComplete?: () => void;
  message?: string;
  emoji?: string;
  duration?: number;
}

export function SuccessAnimation({
  visible,
  onComplete,
  message = 'Success!',
  emoji = '🎉',
  duration = 2000,
}: SuccessAnimationProps) {
  const { theme } = useTheme();

  // Animated values
  const scale = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const confettiScale = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Reset all values
      scale.value = 0;
      checkScale.value = 0;
      opacity.value = 0;
      confettiScale.value = 0;
      confettiOpacity.value = 0;

      // Start animation sequence
      opacity.value = withTiming(1, { duration: 200 });
      
      scale.value = withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 12 })
      );

      checkScale.value = withDelay(
        200,
        withSequence(
          withSpring(1.3, { damping: 6 }),
          withSpring(1, { damping: 10 })
        )
      );

      confettiScale.value = withDelay(
        100,
        withSpring(1, { damping: 10 })
      );

      confettiOpacity.value = withDelay(
        100,
        withSequence(
          withTiming(1, { duration: 300 }),
          withDelay(
            duration - 800,
            withTiming(0, { duration: 500 })
          )
        )
      );

      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 }, () => {
          onComplete?.();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const mainStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const confettiContainerStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
    transform: [{ scale: confettiScale.value }],
  }));

  const styles = createStyles(theme);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.overlay, containerStyle]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        >
          {/* Confetti */}
          <Animated.View style={[styles.confettiContainer, confettiContainerStyle]}>
            {/* Top confetti */}
            <Text style={[styles.confetti, styles.confetti1]}>🎊</Text>
            <Text style={[styles.confetti, styles.confetti2]}>🎉</Text>
            <Text style={[styles.confetti, styles.confetti3]}>✨</Text>
            <Text style={[styles.confetti, styles.confetti4]}>🎊</Text>
            <Text style={[styles.confetti, styles.confetti5]}>⭐</Text>
            <Text style={[styles.confetti, styles.confetti6]}>💫</Text>
            <Text style={[styles.confetti, styles.confetti7]}>🎉</Text>
            <Text style={[styles.confetti, styles.confetti8]}>✨</Text>
          </Animated.View>

          {/* Success content */}
          <Animated.View style={[styles.content, mainStyle]}>
            <LinearGradient
              colors={[theme.colors.primary + '30', theme.colors.secondary + '30']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <Animated.View style={checkStyle}>
                <View style={styles.emojiContainer}>
                  <LinearGradient
                    colors={[theme.colors.success + '40', theme.colors.success + '20']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emojiGradient}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </LinearGradient>
                </View>
              </Animated.View>

              <Text style={styles.message}>{message}</Text>
            </LinearGradient>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  confetti: {
    position: 'absolute',
    fontSize: 32,
  },
  confetti1: { top: '15%', left: '20%' },
  confetti2: { top: '20%', right: '15%' },
  confetti3: { top: '25%', left: '10%' },
  confetti4: { top: '30%', right: '25%' },
  confetti5: { bottom: '30%', left: '15%' },
  confetti6: { bottom: '25%', right: '20%' },
  confetti7: { bottom: '35%', left: '25%' },
  confetti8: { bottom: '20%', right: '10%' },
  content: {
    width: '80%',
    maxWidth: 320,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.success + '60',
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  emojiContainer: {
    marginBottom: 16,
    borderRadius: 50,
    overflow: 'hidden',
  },
  emojiGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 56,
  },
  message: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

// Example usage in components:
/*
import { SuccessAnimation } from '../components/SuccessAnimation';

function MyComponent() {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSuccess = () => {
    setShowSuccess(true);
  };

  return (
    <>
      <TouchableOpacity onPress={handleSuccess}>
        <Text>Complete Action</Text>
      </TouchableOpacity>

      <SuccessAnimation
        visible={showSuccess}
        onComplete={() => setShowSuccess(false)}
        message="Memory Created! 🎉"
        emoji="✨"
        duration={2000}
      />
    </>
  );
}
*/