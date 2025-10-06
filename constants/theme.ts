// constants/theme.ts
import { Platform } from 'react-native';

// Romantic Color Palette
export const RomanticColors = {
  // Primary romantic colors
  rosePink: '#FF6B9D',
  softPink: '#FFB3D9',
  lavender: '#C9A0DC',
  violet: '#8B5CF6',
  deepPurple: '#7C3AED',
  
  // Accent colors
  peach: '#FFB5A7',
  coral: '#FF8E8E',
  blush: '#FFC9E5',
  
  // Neutral romantic tones
  cream: '#FFF8F3',
  warmWhite: '#FFFBF7',
  softGray: '#F5F0F6',
  dustyRose: '#D4A5A5',
  
  // Gradients (for LinearGradient) - ADD 'as const' to each
  sunsetGradient: ['#FF6B9D', '#C9A0DC'] as const,
  twilightGradient: ['#8B5CF6', '#EC4899'] as const,
  dreamyGradient: ['#FFB3D9', '#C9A0DC', '#8B5CF6'] as const,
  warmGradient: ['#FFB5A7', '#FF6B9D'] as const,
};

const tintColorLight = '#FF6B9D';
const tintColorDark = '#C9A0DC';

export const Colors = {
  light: {
    text: '#1F2937',
    background: '#FFFBF7',
    tint: tintColorLight,
    icon: '#9CA3AF',
    tabIconDefault: '#D4A5A5',
    tabIconSelected: tintColorLight,
    cardBackground: '#FFFFFF',
    border: '#FFE4F1',
    accent: '#FF6B9D',
    secondary: '#C9A0DC',
  },
  dark: {
    text: '#F9FAFB',
    background: '#1A1625',
    tint: tintColorDark,
    icon: '#D1D5DB',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorDark,
    cardBackground: '#2D2438',
    border: '#3F2E4A',
    accent: '#C9A0DC',
    secondary: '#8B5CF6',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});