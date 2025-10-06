// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasekey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(supabaseUrl, supabasekey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database Types
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
  couple_id?: string | null;
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

export interface Memory {
  id: string;
  couple_id?: string | null;
  created_by: string;
  title?: string;
  description?: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemoryItem {
  id: string;
  memory_id: string;
  type: 'photo' | 'journal' | 'audio';
  content?: string;
  file_url?: string;
  caption?: string;
  created_at: string;
}

export interface Milestone {
  id: string;
  couple_id?: string | null;
  title: string;
  description?: string;
  milestone_date: string;
  photos?: string[];
  created_by: string;
  created_at: string;
}