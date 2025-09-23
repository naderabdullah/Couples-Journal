import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-url-polyfill/auto';

// Replace with your Supabase project URL and anon key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
// Custom storage implementation using Expo SecureStore for tokens
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('SecureStore getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database Types (extend as needed)
export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  partner_id?: string;
  couple_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Couple {
  id: string;
  partner1_id: string;
  partner2_id: string;
  couple_name?: string;
  anniversary_date?: string;
  created_at: string;
  status: 'pending' | 'active';
}

export interface JournalEntry {
  id: string;
  user_id: string;
  couple_id: string;
  title?: string;
  content: string;
  mood?: 'great' | 'good' | 'okay' | 'sad' | 'stressed';
  is_shared: boolean;
  photos?: string[];
  created_at: string;
  updated_at: string;
}

export interface GratitudeEntry {
  id: string;
  from_user_id: string;
  to_user_id: string;
  couple_id: string;
  content: string;
  created_at: string;
}

export interface QuestionResponse {
  id: string;
  user_id: string;
  couple_id: string;
  question_id: string;
  response: string;
  created_at: string;
}