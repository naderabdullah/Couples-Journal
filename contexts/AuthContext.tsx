// contexts/AuthContext.tsx
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, supabase } from '../lib/supabase';

interface InviteCode {
  id: string;
  code: string;
  created_at: string;
  expires_at: string;
  is_used: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  generateInviteCode: () => Promise<{ code?: string; error?: any }>;
  acceptInviteCode: (code: string) => Promise<{ success: boolean; error?: any }>;
  getCurrentInviteCode: () => Promise<{ code?: InviteCode; error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to generate a random 6-character code
const generateRandomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    // Subscribe to profile changes in real-time
    const profileSubscription = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user?.id}`,
        },
        (payload) => {
          console.log('Profile updated:', payload);
          if (user) {
            fetchProfile(user.id);
          }
        }
      )
      .subscribe();

    return () => {
      authSubscription.unsubscribe();
      profileSubscription.unsubscribe();
    };
  }, [user?.id]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile error:', error);
        if (error.code === 'PGRST116') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('profiles').insert({
              id: userId,
              email: user.email!,
              display_name: user.email?.split('@')[0] || 'User',
            });
          }
        }
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Profile fetch error:', error);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email!,
          display_name: displayName,
        });
      }

      return { data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error('No user');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
      await fetchProfile(user.id);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const generateInviteCode = async () => {
    try {
      if (!user) throw new Error('No user');

      // Check if user already has a couple
      if (profile?.couple_id) {
        return { error: { message: 'You are already connected to a partner' } };
      }

      // Delete any existing unused codes for this user
      await supabase
        .from('couple_invite_codes')
        .delete()
        .eq('created_by', user.id)
        .eq('is_used', false);

      // Generate unique code
      let code = generateRandomCode();
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const { data: existing } = await supabase
          .from('couple_invite_codes')
          .select('id')
          .eq('code', code)
          .single();

        if (!existing) break;
        code = generateRandomCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique code');
      }

      // Create new code (expires in 1 hour)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const { data, error } = await supabase
        .from('couple_invite_codes')
        .insert({
          code,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return { code: data.code, error: null };
    } catch (error) {
      console.error('Generate invite code error:', error);
      return { error };
    }
  };

  const getCurrentInviteCode = async () => {
    try {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('couple_invite_codes')
        .select('*')
        .eq('created_by', user.id)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return { code: data || undefined, error: null };
    } catch (error) {
      console.error('Get current invite code error:', error);
      return { error };
    }
  };

  const acceptInviteCode = async (code: string) => {
    try {
      if (!user) throw new Error('No user');

      // Check if user already has a couple
      if (profile?.couple_id) {
        return { 
          success: false, 
          error: { message: 'You are already connected to a partner' } 
        };
      }

      // Call the database function to connect the couple
      // This bypasses RLS and updates both profiles
      const { data, error } = await supabase.rpc('connect_couple', {
        p_code: code.trim(),
        p_accepter_id: user.id,
      });

      if (error) {
        console.error('Connect couple error:', error);
        return { success: false, error };
      }

      // Check the result from the function
      if (!data.success) {
        return { 
          success: false, 
          error: { message: data.error || 'Failed to connect' } 
        };
      }

      // Refresh current user's profile
      await fetchProfile(user.id);

      return { success: true, error: null };
    } catch (error) {
      console.error('Accept invite code error:', error);
      return { success: false, error };
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    generateInviteCode,
    acceptInviteCode,
    getCurrentInviteCode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};