import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  setManualAuth: (user: User | null, profile: UserProfile | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  isAdmin: false,
  setManualAuth: () => {},
  logout: () => {} 
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const setManualAuth = (u: User | null, p: UserProfile | null) => {
    setUser(u);
    setProfile(p);
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[Auth] SignOut error:", err);
    } finally {
      setUser(null);
      setProfile(null);
      setLoading(false);
      // Force page reload to clear any sensitive state
      window.location.reload();
    }
  };

  useEffect(() => {
    let mounted = true;
    // Fallback: Garantir que o loading não dure para sempre se o Supabase não responder
    const timeout = setTimeout(() => {
      if (loading && mounted) {
        console.warn("[Auth] Timeout - Releasing UI lock");
        setLoading(false);
      }
    }, 6000); // 6s timeout for better experience

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        clearTimeout(timeout);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchProfile(currentUser);
        } else {
          setLoading(false);
        }
      }
    }).catch(err => {
      console.error("[Auth] Initial session fetch failed:", err);
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] State changed: ${event}`);
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (currentUser: User) => {
    try {
      // Clear profile while fetching to avoid showing old data
      setProfile(null);
      
      console.log(`[Auth] Fetching profile for: ${currentUser.email}`);

      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', currentUser.id)
        .single();

      // Fallback: search by email if UID not matched
      if (error && error.code === 'PGRST116' && currentUser.email) {
        const { data: emailData, error: emailError } = await supabase
          .from('users')
          .select('*')
          .eq('email', currentUser.email)
          .single();
        
        if (emailData) {
          data = emailData;
          error = null;
          // Update UID if it was missing
          if (!data.uid) {
            supabase.from('users').update({ uid: currentUser.id }).eq('id', data.id).then();
          }
        }
      }

      const isMaster = currentUser.email && [
        'ai.auroratech@gmail.com',
        'pedro_santos@akanni.com',
        'pedrohenrique0806@gmail.com',
        'pedro@akanni.com'
      ].includes(currentUser.email);

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn("[Auth] No profile found in 'users' table.");
        } else {
          console.error("[Auth] Database error:", error);
        }
        
        if (isMaster) {
          const mProfile: UserProfile = {
            id: currentUser.email || currentUser.id,
            uid: currentUser.id,
            displayName: 'ADMIN MESTRE',
            email: currentUser.email!,
            role: 'super_admin'
          };
          setProfile(mProfile);
          console.log("[Auth] Master bypass enabled.");
        } else {
          setProfile(null);
        }
      } else if (data) {
        const newProfile: UserProfile = {
          id: data.id,
          uid: data.uid || currentUser.id,
          displayName: data.display_name || data.username || 'USUÁRIO',
          email: data.email,
          role: isMaster ? 'super_admin' : data.role
        };
        setProfile(newProfile);
        console.log("[Auth] Profile loaded:", newProfile.role);
      }
    } catch (err) {
      console.error("[Auth] Unexpected error in fetchProfile:", err);
      setProfile(null);
    } finally {
      // Always stop loading after attempt
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin: profile?.role === 'super_admin' || profile?.role === 'admin_geral',
      setManualAuth,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
