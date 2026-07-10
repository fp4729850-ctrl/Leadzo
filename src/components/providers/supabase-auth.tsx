import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase.ts';

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signin: () => Promise<void>;
  signout: () => Promise<void>;
  error: Error | null;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  session: null,
  isLoading: true,
  signin: async () => {},
  signout: async () => {},
  error: null,
});

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/auth/callback' } });
  };

  const signout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!session,
      user: session?.user ?? null,
      session,
      isLoading,
      signin,
      signout,
      error: null
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
