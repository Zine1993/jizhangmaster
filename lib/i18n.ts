// Lightweight i18n helpers and default labels for built-in ids
// - displayNameFor: show localized name for built-in emotions/categories by id, fall back to user's custom name
// - formatCurrency/formatNumber/formatDate: Intl-based formatters with safe fallbacks
// - getCurrencySymbol: obtain narrow symbol by Intl, fallback to map/code

export type Scope = 'emotions' | 'expenseCategories' | 'incomeCategories';

const EMOTION_LABELS = {
  zh: {
    happy: '开心',
    anxious: '焦虑',
    lonely: '孤独',
    bored: '无聊',
    reward: '奖励自己',
    stress: '压力大',
    excited: '兴奋',
    sad: '难过',
  },
  en: {
    happy: 'Happy',
    anxious: 'Anxious',
    lonely: 'Lonely',
    bored: 'Bored',
    reward: 'Treat myself',
    stress: 'Stressed',
    excited: 'Excited',
    sad: 'Sad',
  },
} as const;

const EXPENSE_LABELS = {
  zh: {
    food: '餐饮',
    transport: '交通',
    shopping: '购物',
    housing: '住房',
    entertainment: '娱乐',
    medical: '医疗',
    education: '教育',
    travel: '旅行',
    transfer: '转账',
  },
  en: {
    food: 'Food',
    transport: 'Transport',
    shopping: 'Shopping',
    housing: 'Housing',
    entertainment: 'Entertainment',
    medical: 'Medical',
    education: 'Education',
    travel: 'Travel',
    transfer: 'Transfer',
  },
} as const;

const INCOME_LABELS = {
  zh: {
    salary: '工资',
    freelance: '兼职',
    investment: '投资',
    other: '其他',
    transfer: '转账',
  },
  en: {
    salary: 'Salary',
    freelance: 'Freelance',
    investment: 'Investment',
    other: 'Other',
    transfer: 'Transfer',
  },
} as const;

export function displayNameFor(
  item: { id: string; name: string },
  scope: Scope,
  t?: (k: string, vars?: Record<string, any>) => string,
  language?: 'zh' | 'en' | 'es' | 'fr' | 'de' | 'ja' | 'ko'
): string {
  const tryT = (key: string) => {
    if (!t) return null;
    try {
      const val = t(key);
      if (val && val !== key && val !== '...') return val;
    } catch {}
    return null;
  };

  const id = String(item?.id || '');
  if (!id) return item?.name || '';

  const key = scope + '.' + id;
  const viaT = tryT(key);
  if (viaT) return viaT;

  const lang = language || 'en';
  const choose = <T extends Record<string, any>>(dict: T): string | undefined => {
    const pack = (dict as any)[lang] ?? (dict as any).en;
    return pack?.[id];
  };

  let label: string | undefined;
  if (scope === 'emotions') label = choose(EMOTION_LABELS);
  else if (scope === 'expenseCategories') label = choose(EXPENSE_LABELS);
  else label = choose(INCOME_LABELS);

  return label ?? (item?.name || id);
}

const SYMBOLS: Record<string, string> = {
  CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: '¥', KRW: '₩', HKD: 'HK$', TWD: 'NT$',
  SGD: 'S$', AUD: 'A$', CAD: 'C$', CHF: 'CHF', SEK: 'kr', NOK: 'kr', DKK: 'kr',
  RUB: '₽', INR: '₹', BRL: 'R$', MXN: '$', ZAR: 'R', THB: '฿', VND: '₫', IDR: 'Rp',
  MYR: 'RM', PHP: '₱',
};

// 常见错误与大小写纠正（如 'uss' -> 'USD'）
const CURRENCY_FIX_MAP: Record<string, string> = {
  uss: 'USD',
  usd: 'USD',
  rmb: 'CNY',
  cny: 'CNY',
  jpy: 'JPY',
  eur: 'EUR',
  hkd: 'HKD',
  gbp: 'GBP',
  krw: 'KRW',
  twd: 'TWD',
  aud: 'AUD',
  cad: 'CAD',
  sgd: 'SGD',
  thb: 'THB',
  vnd: 'VND',
};

export function normalizeCurrency(code?: string): string | undefined {
  if (!code) return undefined;
  const norm = String(code).trim().toLowerCase();
  const fixed = CURRENCY_FIX_MAP[norm] || norm.toUpperCase();
  return fixed;
}

export function getCurrencySymbol(code: string, locale?: string): string {
  const norm = normalizeCurrency(code) || 'USD';
  try {
    const loc =
      locale ||
      ((Intl as any)?.DateTimeFormat?.().resolvedOptions?.().locale as string) ||
      'en';
    const parts = new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: norm,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(1);
    const sym = parts.find((p) => p.type === 'currency')?.value;
    return sym || SYMBOLS[norm] || norm;
  } catch {
    return SYMBOLS[norm] || norm;
  }
}

export function formatCurrency(amount: number, currency: string, locale?: string): string {
  const norm = normalizeCurrency(currency) || 'USD';
  const n = Number.isFinite(amount) ? amount : 0;

  // 对 USD 强制使用 $，避免部分 locale 输出“US$”
  if (norm === 'USD') {
    try {
      const loc =
        locale ||
        ((Intl as any)?.DateTimeFormat?.().resolvedOptions?.().locale as string) ||
        'en';
      // 先用本地数字格式化，再用自定义符号拼接，避免 Intl 的“US$”
      const num = new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
      const sym = SYMBOLS['USD'] || '$';
      return `${sym}${num}`;
    } catch {
      const sym = SYMBOLS['USD'] || '$';
      return `${sym}${n.toFixed(2)}`;
    }
  }

  try {
    const loc =
      locale ||
      ((Intl as any)?.DateTimeFormat?.().resolvedOptions?.().locale as string) ||
      'en';
    return new Intl.NumberFormat(loc, { style: 'currency', currency: norm }).format(n);
  } catch {
    const sym = SYMBOLS[norm] || norm;
    return `${sym}${n.toFixed(2)}`;
  }
}

export function formatNumber(n: number, locale?: string, options?: Intl.NumberFormatOptions) {
  try {
    const loc =
      locale ||
      ((Intl as any)?.DateTimeFormat?.().resolvedOptions?.().locale as string) ||
      'en';
    return new Intl.NumberFormat(loc, options).format(n ?? 0);
  } catch {
    return String(n ?? 0);
  }
}

export function formatDate(
  d: Date | string | number,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
) {
  try {
    const date = d instanceof Date ? d : new Date(d);
    const loc =
      locale ||
      ((Intl as any)?.DateTimeFormat?.().resolvedOptions?.().locale as string) ||
      'en';
    return new Intl.DateTimeFormat(
      loc,
      options || { year: 'numeric', month: '2-digit', day: '2-digit' }
    ).format(date);
  } catch {
    return String(d);
  }
}