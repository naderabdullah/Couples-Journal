// contexts/OnboardingContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { ThemeName } from '../constants/themes';

interface OnboardingData {
  displayName: string;
  avatarUrl: string;
  theme: ThemeName;
  email: string;
  password: string;
}

interface OnboardingContextType {
  data: OnboardingData;
  setDisplayName: (name: string) => void;
  setAvatarUrl: (url: string) => void;
  setTheme: (theme: ThemeName) => void;
  setCredentials: (email: string, password: string) => void;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const initialData: OnboardingData = {
  displayName: '',
  avatarUrl: '',
  theme: 'light',
  email: '',
  password: '',
};

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(initialData);

  const setDisplayName = (name: string) => {
    setData(prev => ({ ...prev, displayName: name }));
  };

  const setAvatarUrl = (url: string) => {
    setData(prev => ({ ...prev, avatarUrl: url }));
  };

  const setTheme = (theme: ThemeName) => {
    setData(prev => ({ ...prev, theme }));
  };

  const setCredentials = (email: string, password: string) => {
    setData(prev => ({ ...prev, email, password }));
  };

  const reset = () => {
    setData(initialData);
  };

  return (
    <OnboardingContext.Provider value={{ data, setDisplayName, setAvatarUrl, setTheme, setCredentials, reset }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}