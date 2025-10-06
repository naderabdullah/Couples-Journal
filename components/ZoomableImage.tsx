// components/ZoomableImage.tsx
import { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_SAFE_AREA = 140; // Reserve space for back button at top

interface ZoomableImageProps {
  uri: string;
}

export function ZoomableImage({ uri }: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const hintOpacity = useSharedValue(1);

  useEffect(() => {
    // Fade out hint after 2 seconds
    hintOpacity.value = withDelay(2000, withTiming(0, { duration: 500 }));
  }, []);

  const clampValues = (x: number, y: number, currentScale: number) => {
    'worklet';
    
    // Calculate how much the image extends beyond screen bounds when scaled
    const scaledWidth = SCREEN_WIDTH * currentScale;
    const scaledHeight = SCREEN_HEIGHT * currentScale;
    
    // Maximum translation allowed to keep image visible
    // For horizontal: half of the extra width, but keep at least 20% visible on each side
    const maxTranslateX = Math.max(0, (scaledWidth - SCREEN_WIDTH) / 2);
    const minVisibleWidth = SCREEN_WIDTH * 0.2; // Keep at least 20% visible
    const boundX = Math.min(maxTranslateX, scaledWidth - minVisibleWidth);
    
    // For vertical: account for header safe area and keep at least 20% visible
    const maxTranslateY = Math.max(0, (scaledHeight - SCREEN_HEIGHT) / 2);
    const minVisibleHeight = SCREEN_HEIGHT * 0.2;
    const boundY = Math.min(maxTranslateY, scaledHeight - minVisibleHeight);
    
    // Clamp X
    let clampedX = Math.max(-boundX, Math.min(boundX, x));
    
    // Clamp Y with additional constraint for header safe area
    // Don't allow image to cover the top header area when panning up
    let clampedY = Math.max(-boundY, Math.min(boundY, y));
    
    // Additional constraint: when panning up (negative Y), ensure we don't cover header
    if (clampedY < 0) {
      const maxUpwardPan = -(scaledHeight / 2 - SCREEN_HEIGHT / 2 + HEADER_SAFE_AREA);
      clampedY = Math.max(maxUpwardPan, clampedY);
    }
    
    return { x: clampedX, y: clampedY };
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = savedScale.value * e.scale;
      // Limit zoom between 1x and 4x
      scale.value = Math.max(1, Math.min(4, newScale));
      
      // When zooming out, bring image back to bounds
      if (scale.value < savedScale.value) {
        const clamped = clampValues(translateX.value, translateY.value, scale.value);
        translateX.value = clamped.x;
        translateY.value = clamped.y;
      }
    })
    .onEnd(() => {
      // Limit zoom
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
      } else {
        savedScale.value = scale.value;
      }
      
      // Ensure image stays in bounds after pinch
      const clamped = clampValues(translateX.value, translateY.value, scale.value);
      if (clamped.x !== translateX.value || clamped.y !== translateY.value) {
        translateX.value = withSpring(clamped.x);
        translateY.value = withSpring(clamped.y);
        savedTranslateX.value = clamped.x;
        savedTranslateY.value = clamped.y;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const newX = savedTranslateX.value + e.translationX;
      const newY = savedTranslateY.value + e.translationY;
      
      // Clamp values during pan
      const clamped = clampValues(newX, newY, scale.value);
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        // Reset zoom
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        // Zoom to 2x
        scale.value = withSpring(2);
        savedScale.value = 2;
        // Keep position within bounds when zooming
        const clamped = clampValues(0, 0, 2);
        translateX.value = withSpring(clamped.x);
        translateY.value = withSpring(clamped.y);
        savedTranslateX.value = clamped.x;
        savedTranslateY.value = clamped.y;
      }
    });

  const composedGesture = Gesture.Simultaneous(
    Gesture.Race(doubleTapGesture, pinchGesture),
    panGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  return (
    <>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
          />
        </Animated.View>
      </GestureDetector>
      <Animated.View style={[styles.hintContainer, hintStyle]} pointerEvents="none">
        <Text style={styles.hintText}>Pinch to zoom • Double tap to reset</Text>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  hintText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});