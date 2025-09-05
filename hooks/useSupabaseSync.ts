import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

export type ServerTransaction = {
  id?: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string | null;
  occurred_at: string; // ISO string
  currency: string;
  emotion?: string | null;
};

export type ServerAccount = {
  id?: string;
  name: string;
  type: 'cash' | 'debit_card' | 'credit_card' | 'prepaid_card' | 'virtual_card' | 'e-wallet' | 'investment' | 'other';
  currency: string;
  initial_balance: number;

  created_at: string; // ISO
};

export type UserSettings = {
  user_id: string;
  language: 'en' | 'zh' | 'es' | 'fr' | 'de' | 'ja' | 'ko';
  currency: string;
  theme: 'light' | 'dark' | 'system';
  updated_at: string;
  gate_pwd_hash?: string | null;
};

export function useSupabaseSync() {
  // 未配置云端时，返回安全桩，避免初始化与网络调用
  if (!isSupabaseConfigured()) {
    const notConfigured = async (..._args: any[]) => {
      throw new Error('Supabase not configured');
    };
    return {
      getUserSettings: notConfigured as (userId: string) => Promise<UserSettings>,
      upsertUserSettings: notConfigured as (
        userId: string,
        patch: Partial<Omit<UserSettings, 'user_id' | 'updated_at'>>
      ) => Promise<UserSettings>,
      upsertTransactions: async (_userId: string, _txs: ServerTransaction[]) => [] as any[],
      deleteTransactions: async (_userId: string, _ids: string[]) => [] as any[],
      fetchTransactions: async (_userId: string, _fromISO?: string, _toISO?: string) => [] as any[],
      // accounts stubs
      upsertAccounts: async (_userId: string, _acs: ServerAccount[]) => [] as any[],
      deleteAccounts: async (_userId: string, _ids: string[]) => [] as any[],
      fetchAccounts: async (_userId: string) => [] as any[],
      wipeAllUserData: async (_userId: string) => {},
      fullSync: async (_userId: string, _localTxs: ServerTransaction[]) => [] as any[],
    };
  }

  const supabase = getSupabase();

  const getUserSettings = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data as UserSettings;
  };

  const upsertUserSettings = async (
    userId: string,
    patch: Partial<Omit<UserSettings, 'user_id' | 'updated_at'>>
  ) => {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return data as UserSettings;
  };

  const upsertTransactions = async (userId: string, txs: ServerTransaction[]) => {
    if (!txs.length) return [];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const withId: any[] = [];
    const withoutId: any[] = [];
    for (const t of txs) {
      const row: any = { ...t, user_id: userId };
      const idStr = t.id ? String(t.id) : '';
      if (idStr && uuidRegex.test(idStr)) {
        withId.push(row);
      } else {
        delete row.id;
        withoutId.push(row);
      }
    }

    const results: any[] = [];

    if (withId.length) {
      const { data, error } = await supabase
        .from('transactions')
        .upsert(withId, { onConflict: 'id', ignoreDuplicates: false })
        .select('*');
      if (error) throw error;
      if (data) results.push(...data);
    }

    if (withoutId.length) {
      const { data, error } = await supabase
        .from('transactions')
        .insert(withoutId)
        .select('*');
      if (error) throw error;
      if (data) results.push(...data);
    }

    return results;
  };

  const deleteTransactions = async (userId: string, ids: string[]) => {
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .in('id', ids)
      .select('*');
    if (error) throw error;
    return data as any[];
  };

  const fetchTransactions = async (userId: string, fromISO?: string, toISO?: string) => {
    let q = supabase.from('transactions').select('*').eq('user_id', userId).order('occurred_at', { ascending: false });
    if (fromISO) q = q.gte('occurred_at', fromISO);
    if (toISO) q = q.lt('occurred_at', toISO);
    const { data, error } = await q;
    if (error) throw error;
    return data as any[];
  };

  const upsertAccounts = async (userId: string, acs: ServerAccount[]) => {
    if (!acs.length) return [];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const withId: any[] = [];
    const withoutId: any[] = [];

    const normalizeAccountType = (t: ServerAccount['type']): 'cash' | 'bank' | 'card' | 'investment' => {
      switch (t) {
        case 'cash':
          return 'cash';
        case 'investment':
          return 'investment';

        default:
          return 'card'; // 包含 debit_card/credit_card/prepaid_card/virtual_card/e-wallet/other 等
      }
    };

    for (const a of acs) {
      const row: any = { ...a, user_id: userId };
      row.type = normalizeAccountType((a as any).type);
      const idStr = a.id ? String(a.id) : '';
      if (idStr && uuidRegex.test(idStr)) {
        withId.push(row);
      } else {
        delete row.id;
        withoutId.push(row);
      }
    }
    const results: any[] = [];
    if (withId.length) {
      const { data, error } = await supabase
        .from('accounts')
        .upsert(withId, { onConflict: 'id', ignoreDuplicates: false })
        .select('*');
      if (error) throw error;
      if (data) results.push(...data);
    }
    if (withoutId.length) {
      const { data, error } = await supabase
        .from('accounts')
        .insert(withoutId)
        .select('*');
      if (error) throw error;
      if (data) results.push(...data);
    }
    return results;
  };

  const deleteAccounts = async (userId: string, ids: string[]) => {
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from('accounts')
      .delete()
      .eq('user_id', userId)
      .in('id', ids)
      .select('*');
    if (error) throw error;
    return data as any[];
  };

  const fetchAccounts = async (userId: string) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as any[];
  };

  const wipeAllUserData = async (userId: string) => {
    const { error: tErr } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId);
    if (tErr) throw tErr;
    const { error: aErr } = await supabase
      .from('accounts')
      .delete()
      .eq('user_id', userId);
    if (aErr) throw aErr;
  };

  const fullSync = async (userId: string, localTxs: ServerTransaction[]) => {
    await upsertTransactions(userId, localTxs);
    const remote = await fetchTransactions(userId);
    return remote;
  };

  return {
    getUserSettings,
    upsertUserSettings,
    upsertTransactions,
    deleteTransactions,
    fetchTransactions,
    // accounts
    upsertAccounts,
    deleteAccounts,
    fetchAccounts,
    wipeAllUserData,
    fullSync,
  };
}