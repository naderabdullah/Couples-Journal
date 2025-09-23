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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) throw error;

      // Create profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            display_name: displayName,
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error signing up:', error);
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
      console.error('Error signing in:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Refresh profile
      await fetchProfile(user.id);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const sendPartnerInvite = async (partnerEmail: string) => {
    try {
      if (!user || !profile) throw new Error('No user logged in');

      // Check if partner exists
      const { data: partnerData, error: partnerError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', partnerEmail)
        .single();

      if (partnerError) {
        throw new Error('Partner not found. They need to create an account first.');
      }

      // Create couple record
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .insert({
          partner1_id: user.id,
          partner2_id: partnerData.id,
          status: 'pending',
        })
        .select()
        .single();

      if (coupleError) throw coupleError;

      return { data: coupleData, error: null };
    } catch (error) {
      console.error('Error sending partner invite:', error);
      return { data: null, error };
    }
  };

  const acceptPartnerInvite = async (coupleId: string) => {
    try {
      if (!user) throw new Error('No user logged in');

      // Update couple status to active
      const { error: coupleError } = await supabase
        .from('couples')
        .update({ status: 'active' })
        .eq('id', coupleId);

      if (coupleError) throw coupleError;

      // Update both partners' profiles with couple_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ couple_id: coupleId })
        .in('id', [user.id]);

      if (profileError) throw profileError;

      // Refresh profile
      await fetchProfile(user.id);

      return { success: true, error: null };
    } catch (error) {
      console.error('Error accepting partner invite:', error);
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