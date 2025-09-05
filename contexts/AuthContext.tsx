import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

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
  recoveryPending: boolean;
  completePasswordReset: (newPassword: string) => Promise<{ ok: boolean; error?: string }>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);
const SKIP_KEY = '@auth_skipped_login';

const EX = (Constants?.expoConfig?.extra ?? {}) as any;
const AUTH_REDIRECT: string =
  (process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL as string) ||
  (EX?.authRedirectUrl as string) ||
  'https://YOUR_HOST/auth/reset.html'; // 请替换为你托管的 HTTPS 中转页地址

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => (isSupabaseConfigured() ? getSupabase() : null as any), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipped, setSkipped] = useState<boolean>(false);
  const [recoveryPending, setRecoveryPending] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const skipVal = await AsyncStorage.getItem(SKIP_KEY);
        if (!mounted) return;
        setSkipped(skipVal === '1');

        if (isSupabaseConfigured()) {
          const sessRes = await supabase.auth.getSession();
          if (!mounted) return;
          setSession(sessRes.data.session ?? null);
          setUser(sessRes.data.session?.user ?? null);
        } else {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    if (!isSupabaseConfigured()) {
      return () => {
        mounted = false;
      };
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, sess: Session | null) => {
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
    if (!isSupabaseConfigured()) return { ok: false, error: 'Cloud sync is not configured' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const signUpWithPassword = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) return { ok: false, error: 'Cloud sync is not configured' };
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured()) return { ok: false, error: 'Cloud sync is not configured' };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: AUTH_REDIRECT,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const signOut = async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.signOut();
        if (error) return { ok: false, error: error.message };
      }
      await AsyncStorage.setItem(SKIP_KEY, '1');
      setUser(null);
      setSession(null);
      setSkipped(true);
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

  // 处理 Supabase 深链接（密码恢复/魔法链接）：将邮件打开的 URL 中的 token/代码写入会话
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const handleUrl = async (url: string) => {
      try {
        const part = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] || '');
        const sp = new URLSearchParams(part);
        const type = sp.get('type') || sp.get('event'); // recovery/magiclink 等
        const access_token = sp.get('access_token') || sp.get('accessToken') || undefined;
        const refresh_token = sp.get('refresh_token') || sp.get('refreshToken') || undefined;
        const code = sp.get('code') || undefined;
        if (type) {
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token } as any);
          } else if ((supabase.auth as any).exchangeCodeForSession && code) {
            try { await (supabase.auth as any).exchangeCodeForSession(code); } catch {}
          }
          if (type === 'recovery') {
            setRecoveryPending(true);
          }
        }
      } catch {}
    };
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    Linking.getInitialURL().then((u) => { if (u) handleUrl(u); }).catch(() => {});
    return () => { try { sub.remove(); } catch {} };
  }, [supabase]);

  const completePasswordReset = async (newPassword: string) => {
    if (!isSupabaseConfigured()) return { ok: false, error: 'Cloud sync is not configured' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    setRecoveryPending(false);
    return { ok: true };
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
      recoveryPending,
      completePasswordReset,
    }),
    [user, session, loading, skipped, recoveryPending]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}