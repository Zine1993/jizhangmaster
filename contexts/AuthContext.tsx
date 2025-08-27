import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  skipped: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<{ ok: boolean; error?: string }>;
  skipLogin: () => Promise<void>;
  requireLogin: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);
const SKIP_KEY = '@auth_skipped_login';

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipped, setSkipped] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [sessRes, skipVal] = await Promise.all([
          supabase.auth.getSession(),
          AsyncStorage.getItem(SKIP_KEY),
        ]);
        if (!mounted) return;
        setSession(sessRes.data.session ?? null);
        setUser(sessRes.data.session?.user ?? null);
        setSkipped(skipVal === '1');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess && skipped) {
        // 用户已真正登录，清除跳过状态
        AsyncStorage.removeItem(SKIP_KEY).catch(() => {});
        setSkipped(false);
      }
    });
    return () => {
      sub.subscription.unsubscribe();
      mounted = false;
    };
  }, [supabase, skipped]);

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const signUpWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://expo.dev', // 可按需替换深链
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const signOut = async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signOut();
      await AsyncStorage.setItem(SKIP_KEY, '1');
      setUser(null);
      setSession(null);
      setSkipped(true);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Sign out failed' };
    }
  };

  const skipLogin = async () => {
    await AsyncStorage.setItem(SKIP_KEY, '1');
    setSkipped(true);
  };

  const requireLogin = async () => {
    await AsyncStorage.removeItem(SKIP_KEY);
    setSkipped(false);
  };

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      session,
      loading,
      skipped,
      signInWithPassword,
      signUpWithPassword,
      resetPassword,
      signOut,
      skipLogin,
      requireLogin,
    }),
    [user, session, loading, skipped]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}