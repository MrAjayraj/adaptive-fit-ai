import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, SUPABASE_CONFIGURED } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  exitGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Minimum ms between auth attempts (throttle) */
const AUTH_THROTTLE_MS = 5_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null);
  const [user, setUser]         = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest]   = useState<boolean>(
    localStorage.getItem('guest_mode') === 'true'
  );
  const lastAuthAttempt = useRef<number>(0);

  useEffect(() => {
    // ── 1. Fetch current session on mount ────────────────────────
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setIsGuest(false);
          localStorage.removeItem('guest_mode');
        }
      } catch (err) {
        console.error('Auth session error, clearing stale state:', err);
        await supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // ── 2. Listen for all auth state changes ─────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        switch (event) {
          case 'SIGNED_IN':
            setSession(newSession);
            setUser(newSession?.user ?? null);
            setIsGuest(false);
            localStorage.removeItem('guest_mode');
            setIsLoading(false);
            break;

          case 'SIGNED_OUT':
            setSession(null);
            setUser(null);
            setIsLoading(false);
            break;

          case 'TOKEN_REFRESHED':
            // Silently update session — no state disruption
            setSession(newSession);
            break;

          case 'USER_UPDATED':
            setSession(newSession);
            setUser(newSession?.user ?? null);
            break;

          default:
            setSession(newSession);
            setUser(newSession?.user ?? null);
            setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Sign in with Google (throttled) ──────────────────────────────
  const signInWithGoogle = async () => {
    const now = Date.now();
    if (now - lastAuthAttempt.current < AUTH_THROTTLE_MS) {
      toast.error('Please wait a moment before trying again.');
      return;
    }
    lastAuthAttempt.current = now;

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  // ── Sign out — clear ALL local state ─────────────────────────────
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear session state
      setSession(null);
      setUser(null);
      setIsGuest(false);

      // Clear all app-specific localStorage keys
      const keysToRemove = [
        'guest_mode',
        'fitai-state',
        'fitai-rank-state',
        'fitai-local-id',
        'fitai-avatar-url',
        'fitai-joined-challenges',
      ];
      keysToRemove.forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const continueAsGuest = () => {
    localStorage.setItem('guest_mode', 'true');
    setIsGuest(true);
  };

  const exitGuestMode = () => {
    setIsGuest(false);
    const keysToRemove = [
      'guest_mode',
      'fitai-state',
      'fitai-rank-state',
      'fitai-local-id',
      'fitai-avatar-url',
      'fitai-joined-challenges',
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    window.location.href = '/';
  };

  // Show a clear error screen instead of a blank page when env vars are missing
  if (!SUPABASE_CONFIGURED) {
    return (
      <div style={{
        background: '#111113', color: '#FAFAFA', fontFamily: 'sans-serif',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚙️</div>
        <h1 style={{ color: '#F5C518', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Configuration Required
        </h1>
        <p style={{ color: '#9191A0', maxWidth: '420px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Supabase environment variables are missing.
          Set <code style={{ color: '#F5C518' }}>VITE_SUPABASE_URL</code> and{' '}
          <code style={{ color: '#F5C518' }}>VITE_SUPABASE_ANON_KEY</code> in your deployment environment.
        </p>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: '#F5C518', color: '#111113', fontWeight: 700,
            padding: '0.75rem 2rem', borderRadius: '9999px', textDecoration: 'none'
          }}
        >
          Open Supabase Dashboard
        </a>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{ session, user, isGuest, isLoading, signInWithGoogle, signOut, continueAsGuest, exitGuestMode }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
