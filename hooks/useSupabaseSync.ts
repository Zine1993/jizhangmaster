import { getSupabase } from '../lib/supabase';

export type ServerTransaction = {
  id?: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string | null;
  occurred_at: string; // ISO string
  currency: string;
};

export type UserSettings = {
  user_id: string;
  language: 'en' | 'zh' | 'es' | 'fr' | 'de' | 'ja' | 'ko';
  currency: string;
  theme: 'light' | 'dark' | 'system';
  updated_at: string;
};

export function useSupabaseSync() {
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

  const upsertUserSettings = async (userId: string, patch: Partial<Omit<UserSettings, 'user_id' | 'updated_at'>>) => {
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
        // 不携带 id，交给服务端生成
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

  const fullSync = async (userId: string, localTxs: ServerTransaction[]) => {
    // push local
    await upsertTransactions(userId, localTxs);
    // pull latest
    const remote = await fetchTransactions(userId);
    return remote;
  };

  return {
    getUserSettings,
    upsertUserSettings,
    upsertTransactions,
    deleteTransactions,
    fetchTransactions,
    fullSync,
  };
}