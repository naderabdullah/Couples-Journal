import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, ViewProps } from 'react-native';
import { RomanticColors } from '../constants/theme';

interface RomanticCardProps extends ViewProps {
  variant?: 'gradient' | 'solid' | 'glass';
  gradientColors?: readonly [string, string, ...string[]]; // Fix the type
}

export function RomanticCard({ 
  children, 
  style, 
  variant = 'solid',
  gradientColors = RomanticColors.sunsetGradient,
  ...props 
}: RomanticCardProps) {
  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  if (variant === 'glass') {
    return (
      <View style={[styles.card, styles.glassCard, style]} {...props}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.solidCard, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    shadowColor: RomanticColors.rosePink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  solidCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: RomanticColors.blush,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.2)',
  },
});