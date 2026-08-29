import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

const LANDING_URL = process.env.REACT_APP_LANDING_URL || 'https://apps.stellarglobalsupplies.com';
const AuthContext  = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    let error;
    try {
      ({ error } = await supabase.auth.signOut());
    } catch (err) {
      throw new Error(err?.message || 'Sign-out failed');
    }
    if (error) throw new Error(error.message || 'Sign-out failed');
    window.location.replace(LANDING_URL);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
