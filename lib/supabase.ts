import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const EX = (Constants?.expoConfig?.extra ?? {}) as any;
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || EX.supabaseUrl || EX.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || EX.supabaseAnonKey || EX.SUPABASE_ANON_KEY;

export function isSupabaseConfigured() {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn(
        'Supabase not configured: set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY or app.json extra.supabaseUrl / extra.supabaseAnonKey'
      );
    }
    client = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '', {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // RN 环境应禁用
        storage: AsyncStorage,
      },
    });
  }
  return client;
}