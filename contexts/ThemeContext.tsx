// contexts/ThemeContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { Theme, ThemeName, themes } from '../constants/themes';

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (themeName: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Change this to switch themes: 'light' | 'dark' | 'blue' | 'pink'
  const [themeName, setThemeName] = useState<ThemeName>('light');
  
  const changeTheme = (newThemeName: ThemeName) => {
    setThemeName(newThemeName);
  };

  const value = {
    theme: themes[themeName],
    themeName,
    setTheme: changeTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}