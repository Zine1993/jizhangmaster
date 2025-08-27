import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useSupabaseSync, type ServerTransaction } from '@/hooks/useSupabaseSync';

export type Currency =
  | 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'KRW' | 'HKD' | 'TWD' | 'SGD'
  | 'AUD' | 'CAD' | 'CHF' | 'SEK' | 'NOK' | 'DKK' | 'RUB' | 'INR' | 'BRL'
  | 'MXN' | 'ZAR' | 'THB' | 'VND' | 'IDR' | 'MYR' | 'PHP';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: Date;
  emotion?: string; // 新增：情绪标签名称
}

export interface EmotionTag {
  id: string;
  name: string;   // 例如 "开心"
  emoji: string;  // 例如 "😊"
}

interface TransactionContextType {
  transactions: Transaction[];
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  getMonthlyStats: () => { income: number; expense: number; balance: number };
  getCurrencySymbol: () => string;
  exportData: () => string;
  importData: (json: string) => { ok: boolean; imported: number; error?: string };
  // 情绪扩展
  emotions: EmotionTag[];
  addEmotionTag: (name: string, emoji: string) => void;
  removeEmotionTag: (id: string) => void;
  getEmotionStats: () => { name: string; emoji: string; count: number; amount: number }[];
  getTopEmotion: () => { name: string; emoji: string; count: number } | null;
  getUsageDaysCount: () => number;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

const STORAGE_KEY = '@expense_tracker_transactions';
const CURRENCY_STORAGE_KEY = '@expense_tracker_currency';
const EMOTION_STORAGE_KEY = '@expense_tracker_emotions';

const defaultEmotions: EmotionTag[] = [
  { id: 'happy', name: '开心', emoji: '😊' },
  { id: 'anxious', name: '焦虑', emoji: '😰' },
  { id: 'lonely', name: '孤独', emoji: '😔' },
  { id: 'bored', name: '无聊', emoji: '😑' },
  { id: 'reward', name: '奖励自己', emoji: '🎉' },
  { id: 'stress', name: '压力大', emoji: '😣' },
  { id: 'excited', name: '兴奋', emoji: '😄' },
  { id: 'sad', name: '难过', emoji: '😢' },
];

interface TransactionProviderProps {
  children: ReactNode;
}

export function TransactionProvider({ children }: TransactionProviderProps) {
  const { user } = useAuth();
  const { getUserSettings, upsertUserSettings, upsertTransactions, fetchTransactions, deleteTransactions } = useSupabaseSync();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currency, setCurrencyState] = useState<Currency>('CNY');
  const [emotions, setEmotions] = useState<EmotionTag[]>([]);
  const [syncing, setSyncing] = useState(false);

  const lastSyncedUserIdRef = React.useRef<string | null>(null);

  // Load from storage
  useEffect(() => {
    loadTransactions();
    loadCurrency();
    loadEmotions();
  }, []);

  // Persist locally
  useEffect(() => {
    saveTransactions();
  }, [transactions]);

  useEffect(() => {
    saveCurrency();
  }, [currency]);

  useEffect(() => {
    saveEmotions();
  }, [emotions]);

  // On login: pull server (emotions 仅本地，不同步)
  useEffect(() => {
    if (!user) { lastSyncedUserIdRef.current = null; return; }
    if (lastSyncedUserIdRef.current === user.id) return;
    lastSyncedUserIdRef.current = user.id;
    (async () => {
      try {
        setSyncing(true);
        // pull settings
        try {
          const s = await getUserSettings(user.id);
          if (s && isValidCurrency(s.currency)) setCurrencyState(s.currency as Currency);
        } catch (_) {}
        // push local
        const toServer = (t: Transaction): ServerTransaction => {
          const base: Omit<ServerTransaction, 'id'> = {
            type: t.type,
            amount: t.amount,
            category: t.category,
            description: t.description || null,
            occurred_at: t.date.toISOString(),
            currency,
            emotion: t.emotion || null,
          };
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(t.id)) {
            return { id: t.id, ...base };
          }
          return base;
        };
        if (transactions.length) {
          await upsertTransactions(user.id, transactions.map(toServer));
        }
        // pull remote
        const remote = await fetchTransactions(user.id);
        const toLocal = remote.map((r: any): Transaction => ({
          id: String(r.id),
          type: r.type,
          amount: Number(r.amount),
          category: r.category,
          description: r.description ?? '',
          date: new Date(r.occurred_at),
          emotion: r.emotion ? String(r.emotion) : '',
        }));
        setTransactions(toLocal);
      } finally {
        setSyncing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // When currency changes and logged-in: upsert server settings
  useEffect(() => {
    if (!user) return;
    upsertUserSettings(user.id, { currency }).catch(() => {});
  }, [currency, user, upsertUserSettings]);

  const loadTransactions = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const transactionsWithDates = parsed.map((t: any) => ({
          ...t,
          date: new Date(t.date),
        }));
        setTransactions(transactionsWithDates);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const loadCurrency = async () => {
    try {
      const stored = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
      if (stored && isValidCurrency(stored)) {
        setCurrencyState(stored as Currency);
      }
    } catch (error) {
      console.error('Failed to load currency:', error);
    }
  };

  const loadEmotions = async () => {
    try {
      const stored = await AsyncStorage.getItem(EMOTION_STORAGE_KEY);
      if (stored) {
        setEmotions(JSON.parse(stored));
      } else {
        setEmotions(defaultEmotions);
      }
    } catch {
      setEmotions(defaultEmotions);
    }
  };

  const saveTransactions = async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          transactions.map(t => ({ ...t, date: t.date.toISOString() }))
        )
      );
    } catch (error) {
      console.error('Failed to save transactions:', error);
    }
  };

  const saveCurrency = async () => {
    try {
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch (error) {
      console.error('Failed to save currency:', error);
    }
  };

  const saveEmotions = async () => {
    try {
      await AsyncStorage.setItem(EMOTION_STORAGE_KEY, JSON.stringify(emotions));
    } catch {}
  };

  const isValidCurrency = (value: string): boolean => {
    const validCurrencies: Currency[] = [
      'CNY', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'HKD', 'TWD', 'SGD',
      'AUD', 'CAD', 'CHF', 'SEK', 'NOK', 'DKK', 'RUB', 'INR', 'BRL',
      'MXN', 'ZAR', 'THB', 'VND', 'IDR', 'MYR', 'PHP'
    ];
    return validCurrencies.includes(value as Currency);
  };

  const triggerSync = (next: Transaction[]) => {
    if (!user) return;
    if (syncing) return;
    const toServer = (t: Transaction): ServerTransaction => {
      const base: Omit<ServerTransaction, 'id'> = {
        type: t.type,
        amount: t.amount,
        category: t.category,
        description: t.description || null,
        occurred_at: t.date.toISOString(),
        currency,
        emotion: t.emotion || null,
      };
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(t.id)) {
        return { id: t.id, ...base };
      }
      return base;
    };
    (async () => {
      try {
        setSyncing(true);
        await upsertTransactions(user.id, next.map(toServer));
        const remote = await fetchTransactions(user.id);
        const toLocal = remote.map((r: any): Transaction => ({
          id: String(r.id),
          type: r.type,
          amount: Number(r.amount),
          category: r.category,
          description: r.description ?? '',
          date: new Date(r.occurred_at),
          emotion: r.emotion ? String(r.emotion) : '',
        }));
        setTransactions(toLocal);
      } catch (e) {
        console.warn('sync failed', e);
      } finally {
        setSyncing(false);
      }
    })();
  };

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: (globalThis as any)?.crypto?.randomUUID?.() ?? Date.now().toString(),
    };
    setTransactions(prev => {
      const next = [newTransaction, ...prev];
      triggerSync(next);
      return next;
    });
  };

  const updateTransaction = (id: string, updatedTransaction: Omit<Transaction, 'id'>) => {
    setTransactions(prev => {
      const updated: Transaction = { ...updatedTransaction, id };
      const next = prev.map(t => (t.id === id ? updated : t));
      triggerSync(next);
      return next;
    });
  };

  const deleteTransaction = (id: string) => {
    const target = transactions.find(t => t.id === id);
    // 乐观更新：先本地移除
    setTransactions(prev => prev.filter(t => t.id !== id));
    if (!user) return;

    (async () => {
      try {
        setSyncing(true);
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        let serverIds: string[] = [];

        if (uuidRegex.test(id)) {
          serverIds = [id];
        } else if (target) {
          const remote = await fetchTransactions(user.id);
          const match = remote.find((r: any) =>
            String(r.type) === target.type &&
            Number(r.amount) === target.amount &&
            String(r.category) === target.category &&
            String(r.description ?? '') === (target.description || '') &&
            new Date(r.occurred_at).toISOString() === target.date.toISOString()
          );
          if (match?.id) serverIds = [String(match.id)];
        }

        if (serverIds.length) {
          await deleteTransactions(user.id, serverIds);
        }

        const remoteAfter = await fetchTransactions(user.id);
        const toLocal = remoteAfter.map((r: any): Transaction => ({
          id: String(r.id),
          type: r.type,
          amount: Number(r.amount),
          category: r.category,
          description: r.description ?? '',
          date: new Date(r.occurred_at),
          emotion: r.emotion ? String(r.emotion) : '',
        }));
        setTransactions(toLocal);
      } catch (e) {
        console.warn('delete failed', e);
      } finally {
        setSyncing(false);
      }
    })();
  };

  const getCurrencySymbol = () => {
    const currencySymbols: Record<Currency, string> = {
      CNY: '¥',
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      KRW: '₩',
      HKD: 'HK$',
      TWD: 'NT$',
      SGD: 'S$',
      AUD: 'A$',
      CAD: 'C$',
      CHF: 'CHF',
      SEK: 'kr',
      NOK: 'kr',
      DKK: 'kr',
      RUB: '₽',
      INR: '₹',
      BRL: 'R$',
      MXN: '$',
      ZAR: 'R',
      THB: '฿',
      VND: '₫',
      IDR: 'Rp',
      MYR: 'RM',
      PHP: '₱',
    };

    return currencySymbols[currency];
  };

  const getMonthlyStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      );
    });

    const income = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expense;

    return { income, expense, balance };
  };

  const exportData = () => {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      currency,
      emotions,
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        category: t.category,
        description: t.description,
        date: t.date.toISOString(),
        emotion: t.emotion ?? '',
      })),
    };
    return JSON.stringify(payload, null, 2);
  };

  const importData = (json: string) => {
    try {
      const data = JSON.parse(json);
      if (!data || typeof data !== 'object') throw new Error('格式不正确');
      const list = Array.isArray(data.transactions) ? data.transactions : [];
      const toLocal: Transaction[] = list.map((r: any) => ({
        id: String(r.id ?? Date.now().toString() + Math.random()),
        type: r.type === 'income' ? 'income' : 'expense',
        amount: Number(r.amount ?? 0),
        category: String(r.category ?? 'Other'),
        description: String(r.description ?? ''),
        date: new Date(r.date ?? Date.now()),
        emotion: r.emotion ? String(r.emotion) : '',
      }));
      setTransactions(toLocal);
      if (data.currency && isValidCurrency(String(data.currency))) {
        setCurrencyState(String(data.currency) as Currency);
      }
      if (Array.isArray(data.emotions) && data.emotions.length) {
        setEmotions(
          data.emotions.map((e: any, i: number) => ({
            id: String(e.id ?? i + '_' + Date.now()),
            name: String(e.name ?? '自定义'),
            emoji: String(e.emoji ?? '🙂'),
          }))
        );
      }
      triggerSync(toLocal);
      return { ok: true, imported: toLocal.length };
    } catch (e: any) {
      return { ok: false, imported: 0, error: e?.message || '解析失败' };
    }
  };

  const addEmotionTag = (name: string, emoji: string) => {
    setEmotions(prev => [...prev, { id: (globalThis as any)?.crypto?.randomUUID?.() ?? Date.now().toString(), name, emoji }]);
  };

  const removeEmotionTag = (id: string) => {
    setEmotions(prev => prev.filter(e => e.id !== id));
  };

  const getEmotionStats = () => {
    const map = new Map<string, { name: string; emoji: string; count: number; amount: number }>();
    const nameToEmoji = new Map<string, string>(emotions.map(e => [e.name, e.emoji]));
    transactions.forEach(t => {
      const name = t.emotion || '';
      if (!name) return;
      const emoji = nameToEmoji.get(name) || '🙂';
      const hit = map.get(name) || { name, emoji, count: 0, amount: 0 };
      hit.count += 1;
      hit.amount += t.amount;
      map.set(name, hit);
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  };

  const getTopEmotion = () => {
    const stats = getEmotionStats();
    return stats.length ? { name: stats[0].name, emoji: stats[0].emoji, count: stats[0].count } : null;
  };

  const getUsageDaysCount = () => {
    const set = new Set<string>();
    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      set.add(key);
    });
    return set.size;
  };

  const value = useMemo<TransactionContextType>(
    () => ({
      transactions,
      currency,
      setCurrency,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      getMonthlyStats,
      getCurrencySymbol,
      exportData,
      importData,
      emotions,
      addEmotionTag,
      removeEmotionTag,
      getEmotionStats,
      getTopEmotion,
      getUsageDaysCount,
    }),
    [transactions, currency, emotions]
  );

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}
