// contexts/AuthContext.tsx
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  sendPartnerInvite: (partnerEmail: string) => Promise<any>;
  acceptPartnerInvite: (coupleId: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Just get the damn session - no timeout, no retries, just get it
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Try to get profile but don't block on it
        fetchProfile(session.user.id);
      }
      setLoading(false); // DONE LOADING, MOVE ON
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile error:', error);
        // If profile doesn't exist, create it
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

      // Create profile
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

  const sendPartnerInvite = async (partnerEmail: string) => {
    try {
      if (!user) throw new Error('No user');

      const { data: partnerData, error: partnerError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', partnerEmail)
        .single();

      if (partnerError) {
        throw new Error('Partner not found. They need to create an account first.');
      }

      const { data, error } = await supabase
        .from('couples')
        .insert({
          partner1_id: user.id,
          partner2_id: partnerData.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const acceptPartnerInvite = async (coupleId: string) => {
    try {
      if (!user) throw new Error('No user');

      await supabase
        .from('couples')
        .update({ status: 'active' })
        .eq('id', coupleId);

      await supabase
        .from('profiles')
        .update({ couple_id: coupleId })
        .in('id', [user.id]);

      await fetchProfile(user.id);
      return { success: true, error: null };
    } catch (error) {
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
    sendPartnerInvite,
    acceptPartnerInvite,
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