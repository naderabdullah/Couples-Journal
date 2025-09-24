// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-url-polyfill/auto';

// Replace with your Supabase project URL and anon key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasekey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

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

export const supabase = createClient(supabaseUrl, supabasekey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// Database Types (updated to handle solo users)
export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  partner_id?: string;
  couple_id?: string; // Can be null for solo users
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

// Updated to allow null couple_id for solo entries
export interface JournalEntry {
  id: string;
  user_id: string;
  couple_id?: string | null; // Can be null for solo entries
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
  couple_id: string; // Still required since gratitudes need a partner
  content: string;
  created_at: string;
}

// Updated Memory interface to allow null couple_id
export interface Memory {
  id: string;
  couple_id?: string | null; // Can be null for solo memories
  created_by: string;
  title?: string;
  description?: string;
  photos?: string[];
  date: string;
  type?: string;
  created_at: string;
}

// Updated Milestone interface to allow null couple_id
export interface Milestone {
  id: string;
  couple_id?: string | null; // Can be null for solo milestones
  title: string;
  description?: string;
  milestone_date: string;
  photos?: string[];
  created_by: string;
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

// Add Memory and Milestone interfaces
export interface Memory {
  id: string;
  couple_id?: string | null; // Can be null for solo memories
  created_by: string;
  title?: string;
  description?: string;
  photos?: string[];
  date: string;
  type?: string;
  created_at: string;
}

export interface Milestone {
  id: string;
  couple_id?: string | null; // Can be null for solo milestones
  title: string;
  description?: string;
  milestone_date: string;
  photos?: string[];
  created_by: string;
  created_at: string;
}