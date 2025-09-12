import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useSupabaseSync, type ServerTransaction } from '@/hooks/useSupabaseSync';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

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
  emotion_tag_id?: string; // 新增：情绪标签ID
  emotion?: string; // 兼容旧的文本情绪
  accountId?: string; // 账户ID
  currency?: string; // 交易币种（显示优先）
  transferGroupId?: string; // 转账分组ID
  isTransfer?: boolean; // 是否为转账生成的记录
}

export interface ExpenseCategory {
  id: string;
  name: string;   // 例如 "餐饮"
  emoji: string;  // 例如 "🍚"
}

export interface IncomeCategory {
  id: string;
  name: string;   // 例如 "工资"
  emoji: string;  // 例如 "💰"
}

export type AccountType = 'cash' | 'debit_card' | 'credit_card' | 'prepaid_card' | 'virtual_card' | 'e-wallet' | 'investment' | 'other';
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  initialBalance: number;
  creditLimit?: number;
  createdAt: Date;
  archived?: boolean;
}
interface TransactionContextType {
  transactions: Transaction[];
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  getMonthlyStats: () => { income: number; expense: number; balance: number };
  getMonthlyStatsByCurrency: () => { currency: Currency; income: number; expense: number; balance: number; firstAccountDate: Date }[];
  getTotalBalance: () => number;
  getCurrencySymbol: () => string;
  getCurrencySymbolFor: (tx?: Partial<Transaction> | null) => string;
  exportData: () => string;
  importData: (json: string) => { ok: boolean; imported: number; error?: string };
  getUsageDaysCount: () => number;

  // 支出类别扩展
  expenseCategories: ExpenseCategory[];
  addExpenseCategory: (name: string, emoji: string) => void;
  removeExpenseCategory: (id: string) => void;
  resetExpenseCategoriesToDefault: () => void;

  // 收入类别扩展
  incomeCategories: IncomeCategory[];
  addIncomeCategory: (name: string, emoji: string) => void;
  removeIncomeCategory: (id: string) => void;
  resetIncomeCategoriesToDefault: () => void;

  // Accounts (assets)
  accounts: Account[];
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => void;
  updateAccount: (id: string, patch: Partial<Omit<Account, 'id' | 'createdAt'>>) => void;
  archiveAccount: (id: string) => void;

  deleteAccount: (id: string) => void;
  getAccountBalance: (accountId: string) => number;
  getNetWorth: () => number;
  getNetWorthByCurrency: () => { currency: Currency; amount: number }[];
  addTransfer: (fromId: string, toId: string, amount: number, fee?: number, date?: Date, description?: string) => void;
  clearAllData: () => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);



const STORAGE_KEY = '@expense_tracker_transactions';
const CURRENCY_STORAGE_KEY = '@expense_tracker_currency';
const EXPENSE_CATEGORY_STORAGE_KEY = '@expense_tracker_expense_categories';
const INCOME_CATEGORY_STORAGE_KEY = '@expense_tracker_income_categories';
const ACCOUNT_STORAGE_KEY = '@expense_tracker_accounts';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function genUUIDv4(): string {
  try {
    const g: any = globalThis as any;
    if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
    if (g?.crypto?.getRandomValues) {
      const bytes = new Uint8Array(16);
      g.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }
  } catch {}
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}-${Math.random().toString(36).slice(2,10)}`;
}

function isUUIDv4(id: string): boolean {
  return UUID_V4_REGEX.test(String(id));
}

const defaultExpenseCategories: ExpenseCategory[] = [
  { id: 'food', name: '餐饮', emoji: '🍜' },
  { id: 'transport', name: '交通', emoji: '🚌' },
  { id: 'shopping', name: '购物', emoji: '🛍️' },
  { id: 'housing', name: '住房', emoji: '🏠' },
  { id: 'entertainment', name: '娱乐', emoji: '🎮' },
  { id: 'medical', name: '医疗', emoji: '💊' },
  { id: 'education', name: '教育', emoji: '📚' },
  { id: 'travel', name: '旅行', emoji: '✈️' },
];

const defaultIncomeCategories: IncomeCategory[] = [
  { id: 'salary', name: '工资', emoji: '💼' },
  { id: 'freelance', name: '兼职', emoji: '🧑‍💻' },
  { id: 'investment', name: '投资', emoji: '📈' },
  { id: 'other', name: '其他', emoji: '🔖' },
];

interface TransactionProviderProps {
  children: ReactNode;
}

export function TransactionProvider({ children }: TransactionProviderProps) {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { themeMode, setThemeMode } = useTheme();
  const { getUserSettings, upsertUserSettings, upsertTransactions, fetchTransactions, deleteTransactions, upsertAccounts, fetchAccounts, deleteAccounts } = useSupabaseSync();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currency, setCurrencyState] = useState<Currency>('CNY');
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [syncing, setSyncing] = useState(false);

  const lastSyncedUserIdRef = React.useRef<string | null>(null);

  // Load from storage
  useEffect(() => {
    (async () => {
      try {
        // 先确定币种（若无存储则按设备地区推断，失败回退 USD）
        await loadCurrency();
        // 并发加载其余数据
        await Promise.all([
          loadExpenseCategories(),
          loadIncomeCategories(),
          loadTransactions(),
        ]);
        // 最后加载账户（可能需要依赖 currency 的默认值）
        await loadAccounts();
      } catch (e) {
        console.warn('initial load failed', e);
      }
    })();
  }, []);

  // Persist locally
  useEffect(() => {
    saveTransactions();
  }, [transactions]);

  useEffect(() => {
    saveCurrency();
  }, [currency]);

  useEffect(() => {
    saveExpenseCategories();
  }, [expenseCategories]);

  useEffect(() => {
    saveIncomeCategories();
  }, [incomeCategories]);

  useEffect(() => {
    saveAccounts();
  }, [accounts]);

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
          if (s) {
            if (isValidCurrency(s.currency)) setCurrencyState(s.currency as Currency);
            try { if ((s as any).language) setLanguage((s as any).language as any); } catch {}
            try { if ((s as any).theme) setThemeMode((s as any).theme as any); } catch {}
          }
        } catch (_) {}
        
        // sync accounts
        try {
          // push local accounts
          if (accounts.length) {
            const toServerAccounts = accounts.map(a => ({
              id: isUUIDv4(a.id) ? a.id : undefined,
              name: a.name,
              type: a.type,
              currency: a.currency,
              initial_balance: a.initialBalance,
              credit_limit: (typeof a.creditLimit === 'number') ? a.creditLimit : null,
  
              created_at: a.createdAt.toISOString(),
            }));
            await upsertAccounts(user.id, toServerAccounts);
          }
          // pull remote accounts
          const remoteAccounts = await fetchAccounts(user.id);
          const localAccounts = remoteAccounts.map((r: any): Account => ({
            id: String(r.id),
            name: String(r.name),
            type: r.type as AccountType,
            currency: isValidCurrency(String(r.currency)) ? String(r.currency) as Currency : currency,
            initialBalance: Number(r.initial_balance ?? 0),
            creditLimit: (typeof r.credit_limit === 'number') ? Number(r.credit_limit) : undefined,
  
            createdAt: new Date(r.created_at),
          }));
          if (localAccounts.length) {
            setAccounts(localAccounts);
          }
        } catch (e) {
          console.warn('account sync failed', e);
        }
        
        // push local transactions
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
          if (isUUIDv4(t.id)) {
            return { id: t.id, ...base };
          }
          return base;
        };
        if (transactions.length) {
          await upsertTransactions(user.id, transactions.map(toServer));
        }
        // pull remote transactions
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

  useEffect(() => {
    if (!user) return;
    upsertUserSettings(user.id, { language: (language as any) }).catch(() => {});
  }, [language, user, upsertUserSettings]);

  useEffect(() => {
    if (!user) return;
    upsertUserSettings(user.id, { theme: (themeMode as any) }).catch(() => {});
  }, [themeMode, user, upsertUserSettings]);

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
        return;
      }
      // 无存储：优先根据语言映射默认币种；不匹配再按地区；最终兜底 USD
      let cur: Currency | null = null;
      // 语言优先映射
      const langToCurrency: Record<string, Currency> = {
        zh: 'CNY',
        ja: 'JPY',
        ko: 'KRW',
        es: 'EUR',
        fr: 'EUR',
        de: 'EUR',
        en: 'USD',
      };
      if (language && langToCurrency[language]) {
        cur = langToCurrency[language];
      }
      if (!cur) {
        // 回退地区推断
        let locale = '';
        try {
          const ro = (Intl as any)?.DateTimeFormat?.().resolvedOptions?.();
          locale = String(ro?.locale ?? '');
        } catch {}
        const sep = locale.includes('-') ? '-' : (locale.includes('_') ? '_' : '');
        const region = sep ? locale.split(sep)[1]?.toUpperCase?.() : '';
        const eurSet = new Set(['DE','FR','ES','IT','NL','BE','PT','GR','IE','FI','AT','LU','SK','SI','LV','LT','EE','MT','CY']);
        const map: Record<string, Currency> = {
          CN:'CNY', US:'USD', GB:'GBP', JP:'JPY', KR:'KRW', HK:'HKD', TW:'TWD', SG:'SGD',
          AU:'AUD', CA:'CAD', CH:'CHF', SE:'SEK', NO:'NOK', DK:'DKK', RU:'RUB', IN:'INR',
          BR:'BRL', MX:'MXN', ZA:'ZAR', TH:'THB', VN:'VND', ID:'IDR', MY:'MYR', PH:'PHP'
        };
        if (region && eurSet.has(region)) cur = 'EUR';
        else if (region && map[region]) cur = map[region];
      }
      setCurrencyState((cur ?? 'CNY') as Currency);
    } catch (error) {
      console.error('Failed to load currency:', error);
      setCurrencyState('CNY');
    }
  };

  // 一次性迁移：将可能存在的中文ID的内置情绪修正为英文标准ID（幂等）
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

  const loadExpenseCategories = async () => {
    try {
      const stored = await AsyncStorage.getItem(EXPENSE_CATEGORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setExpenseCategories(parsed);
        } else {
          setExpenseCategories(defaultExpenseCategories);
        }
      } else {
        setExpenseCategories(defaultExpenseCategories);
      }
    } catch {
      setExpenseCategories(defaultExpenseCategories);
    }
  };

  const saveExpenseCategories = async () => {
    try {
      await AsyncStorage.setItem(EXPENSE_CATEGORY_STORAGE_KEY, JSON.stringify(expenseCategories));
    } catch {}
  };

  const loadIncomeCategories = async () => {
    try {
      const stored = await AsyncStorage.getItem(INCOME_CATEGORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setIncomeCategories(parsed);
        } else {
          setIncomeCategories(defaultIncomeCategories);
        }
      } else {
        setIncomeCategories(defaultIncomeCategories);
      }
    } catch {
      setIncomeCategories(defaultIncomeCategories);
    }
  };

  const saveIncomeCategories = async () => {
    try {
      await AsyncStorage.setItem(INCOME_CATEGORY_STORAGE_KEY, JSON.stringify(incomeCategories));
    } catch {}
  };

  const loadAccounts = async () => {
    try {
      const stored = await AsyncStorage.getItem(ACCOUNT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const list: Account[] = (Array.isArray(parsed) ? parsed : []).map((a: any) => ({
          id: String(a.id),
          name: String(a.name ?? t('defaultAccountName')),
          type: a.type as AccountType ?? 'cash',
          currency: isValidCurrency(String(a.currency)) ? String(a.currency) as Currency : currency,
          initialBalance: Number(a.initialBalance ?? 0),
          creditLimit: (typeof a.creditLimit === 'number') ? Number(a.creditLimit) : undefined,

          createdAt: new Date(a.createdAt ?? Date.now()),
          archived: !!a.archived,
        }));
        if (list.length) {
          setAccounts(list);
          return;
        }
      }
      // 无账户则创建默认现金钱包
      setAccounts([{
        id: genUUIDv4(),
        name: t('defaultAccountName'),
        type: 'cash',
        currency,
        initialBalance: 0,

        creditLimit: undefined,
        archived: false,
        createdAt: new Date(),
      }]);
    } catch {
      setAccounts([{
        id: genUUIDv4(),
        name: t('defaultAccountName'),
        type: 'cash',
        currency,
        initialBalance: 0,

        creditLimit: undefined,
        archived: false,
        createdAt: new Date(),
      }]);
    }
  };

  const saveAccounts = async () => {
    try {
      await AsyncStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
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
      if (isUUIDv4(t.id)) {
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
    const activeAccount = accounts[0];

    // 信用卡额度校验（仅针对支出）
    try {
      const accId = transaction.accountId || activeAccount?.id;
      if (transaction.type === 'expense' && accId) {
        const acc = accounts.find(a => a.id === accId);
        if (acc?.type === 'credit_card' && typeof acc.creditLimit === 'number' && acc.creditLimit > 0) {
          const projected = getAccountBalance(accId) - transaction.amount;
          const debt = projected < 0 ? -projected : 0;
          if (debt - 1e-8 > acc.creditLimit) {
            throw new Error('CREDIT_LIMIT_EXCEEDED');
          }
        } else if (acc && (acc.type === 'cash' || acc.type === 'debit_card' || acc.type === 'prepaid_card')) {
          const available = getAccountBalance(accId);
          if (available < transaction.amount - 1e-8) {
            throw new Error('INSUFFICIENT_FUNDS');
          }
        }
      }
    } catch (e) {
      throw e;
    }
    const accId2 = transaction.accountId || activeAccount?.id;
    const acc2 = accounts.find(a => a.id === accId2);
    const newTransaction: Transaction = {
      ...transaction,
      id: genUUIDv4(),
      accountId: accId2,
      currency: (transaction as any).currency || acc2?.currency,
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
        let serverIds: string[] = [];

        if (isUUIDv4(id)) {
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

  // 统一对任意交易/账户获取标准符号（避免 US$）
  const getCurrencySymbolFor = (tx?: Partial<Transaction> | null) => {
    const map: Record<string, string> = {
      CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: '¥', KRW: '₩',
      HKD: 'HK$', TWD: 'NT$', SGD: 'S$', AUD: 'A$', CAD: 'C$',
      CHF: 'CHF', SEK: 'kr', NOK: 'kr', DKK: 'kr', RUB: '₽',
      INR: '₹', BRL: 'R$', MXN: '$', ZAR: 'R', THB: '฿', VND: '₫',
      IDR: 'Rp', MYR: 'RM', PHP: '₱',
    };
    const cur =
      (tx as any)?.currency ||
      accounts.find(a => a.id === (tx as any)?.accountId)?.currency ||
      currency;
    return map[String(cur) as keyof typeof map] || '$';
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

    // 排除转账本金，仅保留普通收支
    const normalTx = monthlyTransactions.filter(t => !t.isTransfer && t.category !== 'transfer');

    const income = normalTx
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenseBase = normalTx
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // 仅计入转账手续费：同一 transferGroupId 下的支出-收入 即为手续费
    const transferGroups = new Map<string, { in?: number; out?: number }>();
    monthlyTransactions
      .filter(t => t.isTransfer)
      .forEach(t => {
        const gid = t.transferGroupId || '';
        if (!gid) return;
        const g = transferGroups.get(gid) || {};
        if (t.type === 'income') g.in = (g.in ?? 0) + t.amount;
        else g.out = (g.out ?? 0) + t.amount;
        transferGroups.set(gid, g);
      });
    let transferFees = 0;
    transferGroups.forEach(g => {
      const fee = Math.max(0, (g.out ?? 0) - (g.in ?? 0));
      transferFees += fee;
    });

    const expense = expenseBase + transferFees;
    const balance = income - expense;

    return { income, expense, balance };
  };

  const getMonthlyStatsByCurrency = () => {
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

    const statsByCurrency = new Map<Currency, { income: number; expense: number; firstAccountDate: Date }>();

    const ensureCurrency = (cur: Currency) => {
      if (!statsByCurrency.has(cur)) {
        const accountsForCurrency = accounts.filter(a => a.currency === cur);
        const firstAccountDate = accountsForCurrency.length > 0
          ? accountsForCurrency.reduce((earliest, current) =>
              new Date(current.createdAt) < new Date(earliest.createdAt) ? current : earliest
            ).createdAt
          : new Date();
        statsByCurrency.set(cur, { income: 0, expense: 0, firstAccountDate: new Date(firstAccountDate) });
      }
      return statsByCurrency.get(cur)!;
    };

    // 1) 普通交易：直接计入
    monthlyTransactions
      .filter(t => !t.isTransfer && t.category !== 'transfer')
      .forEach(t => {
        const account = accounts.find(a => a.id === t.accountId);
        const cur = ((t as any).currency || account?.currency) as Currency | undefined;
        if (!cur) return;
        const stats = ensureCurrency(cur);
        if (t.type === 'income') stats.income += t.amount;
        else stats.expense += t.amount;
      });

    // 2) 转账手续费：按支出侧账户币种计入 expense
    const groups = new Map<string, { income?: Transaction; expense?: Transaction }>();
    monthlyTransactions
      .filter(t => t.isTransfer)
      .forEach(t => {
        const gid = t.transferGroupId || '';
        if (!gid) return;
        const g = groups.get(gid) || {};
        if (t.type === 'income') g.income = t;
        else g.expense = t;
        groups.set(gid, g);
      });

    groups.forEach(g => {
      const outAmt = g.expense?.amount ?? 0;
      const inAmt = g.income?.amount ?? 0;
      const fee = Math.max(0, outAmt - inAmt);
      if (fee > 0 && g.expense) {
        const acc = accounts.find(a => a.id === g.expense!.accountId);
        const cur = acc?.currency as Currency | undefined;
        if (!cur) return;
        const stats = ensureCurrency(cur);
        stats.expense += fee;
      }
    });

    return Array.from(statsByCurrency.entries()).map(([currency, { income, expense, firstAccountDate }]) => ({
      currency,
      income,
      expense,
      balance: income - expense,
      firstAccountDate,
    }));
  };

  const getTotalBalance = () => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return totalIncome - totalExpense;
  };

  const exportData = () => {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      currency,
      expenseCategories,
      incomeCategories,
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        category: t.category,
        description: t.description,
        date: t.date.toISOString(),
        emotion: t.emotion ?? '',
        currency: (t as any).currency || '',
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
        id: (r.id && isUUIDv4(String(r.id))) ? String(r.id) : genUUIDv4(),
        type: r.type === 'income' ? 'income' : 'expense',
        amount: Number(r.amount ?? 0),
        category: String(r.category ?? 'Other'),
        description: String(r.description ?? ''),
        date: new Date(r.date ?? Date.now()),
        emotion: r.emotion ? String(r.emotion) : '',
        currency: r.currency ? String(r.currency) : undefined,
      }));
      setTransactions(toLocal);
      if (data.currency && isValidCurrency(String(data.currency))) {
        setCurrencyState(String(data.currency) as Currency);
      }
      if (Array.isArray(data.expenseCategories) && data.expenseCategories.length) {
        setExpenseCategories(
          data.expenseCategories.map((e: any, i: number) => ({
            id: String(e.id ?? i + '_' + Date.now()),
            name: String(e.name ?? '自定义'),
            emoji: String(e.emoji ?? '🧾'),
          }))
        );
      }
      if (Array.isArray(data.incomeCategories) && data.incomeCategories.length) {
        setIncomeCategories(
          data.incomeCategories.map((e: any, i: number) => ({
            id: String(e.id ?? i + '_' + Date.now()),
            name: String(e.name ?? '自定义'),
            emoji: String(e.emoji ?? '💰'),
          }))
        );
      }
      triggerSync(toLocal);
      return { ok: true, imported: toLocal.length };
    } catch (e: any) {
      return { ok: false, imported: 0, error: e?.message || '解析失败' };
    }
  };

  const addExpenseCategory = (name: string, emoji: string) => {
    setExpenseCategories(prev => [...prev, { id: (globalThis as any)?.crypto?.randomUUID?.() ?? Date.now().toString(), name, emoji }]);
  };

  const removeExpenseCategory = (id: string) => {
    setExpenseCategories(prev => prev.filter(e => e.id !== id));
  };

  const resetExpenseCategoriesToDefault = () => {
    setExpenseCategories(defaultExpenseCategories);
  };

  const addIncomeCategory = (name: string, emoji: string) => {
    setIncomeCategories(prev => [...prev, { id: (globalThis as any)?.crypto?.randomUUID?.() ?? Date.now().toString(), name, emoji }]);
  };

  const removeIncomeCategory = (id: string) => {
    setIncomeCategories(prev => prev.filter(e => e.id !== id));
  };

  const resetIncomeCategoriesToDefault = () => {
    setIncomeCategories(defaultIncomeCategories);
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

  // 回填缺失的 accountId 到默认账户
  useEffect(() => {
    if (!accounts.length) return;
    const active = accounts[0];
    if (!active) return;
    if (transactions.some(t => !t.accountId)) {
      setTransactions(prev => prev.map(t => t.accountId ? t : { ...t, accountId: active.id }));
    }
  }, [accounts, transactions]);

  // 账户相关 API
  const addAccount = (account: Omit<Account, 'id' | 'createdAt'>) => {
    if ((account.type === 'cash' || account.type === 'debit_card' || account.type === 'prepaid_card') && (account.initialBalance ?? 0) < 0) {
      throw new Error('INITIAL_BALANCE_NEGATIVE');
    }
    // 名称唯一性兜底（忽略大小写与空白）
    const nameKey = String(account.name ?? '').trim().toLowerCase();
    if (accounts.some(a => String(a.name ?? '').trim().toLowerCase() === nameKey)) {
      throw new Error('ACCOUNT_NAME_DUPLICATE');
    }
    const a: Account = { ...account, id: genUUIDv4(), createdAt: new Date(), archived: false };
    setAccounts(prev => {
      const next = [a, ...prev];
      triggerAccountSync(next);
      return next;
    });
  };

  const updateAccount = (id: string, patch: Partial<Omit<Account, 'id' | 'createdAt'>>) => {
    setAccounts(prev => {
      const next = prev.map(a => a.id === id ? { ...a, ...patch } : a);
      triggerAccountSync(next);
      return next;
    });
  };

  const archiveAccount = (id: string) => {
    const bal = getAccountBalance(id);
    if (Math.abs(bal) > 1e-8) {
      throw new Error('BALANCE_NOT_ZERO');
    }
    setAccounts(prev => {
      const next = prev.map(a => a.id === id ? { ...a, archived: true } : a);
      triggerAccountSync(next);
      return next;
    });
  };



  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    if (!user) return;
    (async () => {
      try {
        setSyncing(true);
        if (isUUIDv4(id)) {
          await deleteAccounts(user.id, [id]);
        }
      } catch (e) {
        console.warn('account delete failed', e);
      } finally {
        setSyncing(false);
      }
    })();
  };

  const triggerAccountSync = (nextAccounts: Account[]) => {
    if (!user) return;
    if (syncing) return;
    (async () => {
      try {
        setSyncing(true);
        const toServerAccounts = nextAccounts.map(a => ({
          id: isUUIDv4(a.id) ? a.id : undefined,
          name: a.name,
          type: a.type,
          currency: a.currency,
          initial_balance: a.initialBalance,
          credit_limit: (typeof a.creditLimit === 'number') ? a.creditLimit : null,

          created_at: a.createdAt.toISOString(),
        }));
        await upsertAccounts(user.id, toServerAccounts);
      } catch (e) {
        console.warn('account sync failed', e);
      } finally {
        setSyncing(false);
      }
    })();
  };

  // 预计算每个账户余额，避免在列表渲染时反复全量遍历交易
  const balancesByAccount = useMemo(() => {
    const map = new Map<string, number>();
    // 基于初始余额初始化
    accounts.forEach(a => {
      map.set(a.id, (a.initialBalance ?? 0));
    });
    // 累加交易变动
    transactions.forEach(t => {
      if (!t.accountId) return;
      const prev = map.get(t.accountId) ?? 0;
      const delta = t.type === 'income' ? t.amount : -t.amount;
      map.set(t.accountId, prev + delta);
    });
    return map;
  }, [accounts, transactions]);

  const getAccountBalance = (accountId: string) => {
    return balancesByAccount.get(accountId) ?? 0;
  };

  const getNetWorth = () => {
    return accounts.reduce((s, a) => s + getAccountBalance(a.id), 0);
  };

  const getNetWorthByCurrency = () => {
    const map = new Map<Currency, number>();
    accounts.forEach(a => {
        const amt = getAccountBalance(a.id);
        map.set(a.currency, (map.get(a.currency) ?? 0) + amt);
      });
    return Array.from(map.entries()).map(([currency, amount]) => ({ currency, amount }));
  };

  const clearAllData = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEY,
        ACCOUNT_STORAGE_KEY,
        EXPENSE_CATEGORY_STORAGE_KEY,
        INCOME_CATEGORY_STORAGE_KEY,
        CURRENCY_STORAGE_KEY,
      ]);
      setTransactions([]);
      setAccounts([]);
      setExpenseCategories(defaultExpenseCategories);
      setIncomeCategories(defaultIncomeCategories);
      setCurrencyState('CNY');
    } catch (e) {
      console.error('Failed to clear all data', e);
    }
  };

  const addTransfer = (fromId: string, toId: string, amount: number, fee: number = 0, date: Date = new Date(), description: string = '') => {
    // 基础校验
    if (!fromId || !toId) throw new Error('ACCOUNT_NOT_FOUND');
    if (fromId === toId) throw new Error('SAME_ACCOUNT');
    if (!amount || amount <= 0) throw new Error('INVALID_AMOUNT');

    // 币种一致性校验
    const fromAcc = accounts.find(a => a.id === fromId);
    const toAcc = accounts.find(a => a.id === toId);
    if (!fromAcc || !toAcc) throw new Error('ACCOUNT_NOT_FOUND');
    if (fromAcc.currency !== toAcc.currency) {
      throw new Error('DIFFERENT_CURRENCY');
    }

    // 借方余额/额度校验
    const totalDebit = amount + (fee || 0);
    if (fromAcc.type === 'credit_card' && typeof fromAcc.creditLimit === 'number' && fromAcc.creditLimit > 0) {
      const projected = getAccountBalance(fromId) - totalDebit;
      const debt = projected < 0 ? -projected : 0;
      if (debt - 1e-8 > fromAcc.creditLimit) {
        throw new Error('CREDIT_LIMIT_EXCEEDED');
      }
    } else {
      const available = getAccountBalance(fromId);
      if (available < totalDebit - 1e-8) {
        throw new Error('INSUFFICIENT_FUNDS');
      }
    }

    const gid = genUUIDv4();

    const outTx: Omit<Transaction, 'id'> = {
      type: 'expense',
      amount: totalDebit,
      category: 'transfer',
      description,
      date,
      emotion: '',
      accountId: fromId,
      isTransfer: true,
      transferGroupId: gid,
    };

    const inTx: Omit<Transaction, 'id'> = {
      type: 'income',
      amount,
      category: 'transfer',
      description,
      date,
      emotion: '',
      accountId: toId,
      isTransfer: true,
      transferGroupId: gid,
    };

    setTransactions(prev => {
      const next = [{ ...outTx, id: genUUIDv4() }, { ...inTx, id: genUUIDv4() }, ...prev];
      triggerSync(next);
      return next;
    });
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
      getMonthlyStatsByCurrency,
      getTotalBalance,
      getCurrencySymbol,
      getCurrencySymbolFor,
      exportData,
      importData,
      expenseCategories,
      addExpenseCategory,
      removeExpenseCategory,
      resetExpenseCategoriesToDefault,

      incomeCategories,
      addIncomeCategory,
      removeIncomeCategory,
      resetIncomeCategoriesToDefault,
      getUsageDaysCount,

      // accounts & assets
      accounts,
      addAccount,
      updateAccount,
      archiveAccount,

      deleteAccount,
      getAccountBalance,
      getNetWorth,
      getNetWorthByCurrency,
      addTransfer,
      clearAllData,
    }),
    [transactions, currency, expenseCategories, incomeCategories, accounts]
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
