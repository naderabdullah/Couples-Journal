// constants/themes.ts

export interface Theme {
  name: string;
  colors: {
    // Primary colors
    primary: string;
    secondary: string;
    accent: string;
    
    // Background colors
    background: string;
    cardBackground: string;
    inputBackground: string;
    
    // Border colors
    border: string;
    borderLight: string;
    
    // Text colors
    text: string;
    textSecondary: string;
    textLight: string;
    
    // Status colors
    success: string;
    error: string;
    warning: string;
    
    // Navigation colors
    nav1: string;
    nav2: string;
    nav3: string;
    nav4: string;
  };
}

// 1. LIGHT THEME (Default light colors)
export const LightTheme: Theme = {
  name: 'Light',
  colors: {
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    accent: '#C4B5FD',
    
    background: '#FFFFFF',
    cardBackground: '#F9FAFB',
    inputBackground: '#F3F4F6',
    
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    
    text: '#111827',
    textSecondary: '#6B7280',
    textLight: '#9CA3AF',
    
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    
    nav1: '#8B5CF6',
    nav2: '#EC4899',
    nav3: '#3B82F6',
    nav4: '#10B981',
  },
};

// 2. DARK THEME (Dark mode)
export const DarkTheme: Theme = {
  name: 'Dark',
  colors: {
    primary: '#A78BFA',
    secondary: '#C4B5FD',
    accent: '#DDD6FE',
    
    background: '#111827',
    cardBackground: '#1F2937',
    inputBackground: '#374151',
    
    border: '#374151',
    borderLight: '#4B5563',
    
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textLight: '#9CA3AF',
    
    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
    
    nav1: '#A78BFA',
    nav2: '#F472B6',
    nav3: '#60A5FA',
    nav4: '#34D399',
  },
};

// 3. BLUE THEME (Blues, Grays, Cool Tones)
export const BlueTheme: Theme = {
  name: 'Blue',
  colors: {
    primary: '#2563EB',
    secondary: '#1D4ED8',
    accent: '#3B82F6',
    
    background: '#F0F4F8',
    cardBackground: '#FFFFFF',
    inputBackground: '#F0F4F8',
    
    border: '#BFDBFE',
    borderLight: '#DBEAFE',
    
    text: '#1E293B',
    textSecondary: '#475569',
    textLight: '#64748B',
    
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    
    nav1: '#2563EB',
    nav2: '#0EA5E9',
    nav3: '#1E40AF',
    nav4: '#0284C7',
  },
};

// 4. PINK THEME (Pinks, Purples, Soft Pastels)
export const PinkTheme: Theme = {
  name: 'Pink',
  colors: {
    primary: '#EC4899',
    secondary: '#F472B6',
    accent: '#F9A8D4',
    
    background: '#FDF2F8',
    cardBackground: '#FFFFFF',
    inputBackground: '#FCE7F3',
    
    border: '#FBCFE8',
    borderLight: '#FCE7F3',
    
    text: '#831843',
    textSecondary: '#9D174D',
    textLight: '#DB2777',
    
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    
    nav1: '#EC4899',
    nav2: '#F472B6',
    nav3: '#DB2777',
    nav4: '#F9A8D4',
  },
};

// Export all themes
export const themes = {
  light: LightTheme,
  dark: DarkTheme,
  blue: BlueTheme,
  pink: PinkTheme,
};

export type ThemeName = keyof typeof themes;