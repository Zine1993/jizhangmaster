// Lightweight i18n helpers and default labels for built-in ids
// - displayNameFor: show localized name for built-in emotions/categories by id, fall back to user's custom name
// - formatCurrency/formatNumber/formatDate: Intl-based formatters with safe fallbacks
// - getCurrencySymbol: obtain narrow symbol by Intl, fallback to map/code

export type Scope = 'emotions' | 'expenseCategories' | 'incomeCategories';

export function displayNameFor(
  item: { id: string; name: string },
  scope: Scope,
  t?: (k: string, vars?: Record<string, any>) => string,
  language?: 'zh' | 'en' | 'es' | 'fr' | 'de' | 'ja' | 'ko' // language is kept for signature compatibility but not used
): string {
  // Helper to safely call the t-function and check if a translation was found.
  const tryT = (key: string) => {
    if (!t) return null;
    try {
      const val = t(key);
      // A successful translation should not return the key itself or a placeholder.
      if (val && val !== key && !key.endsWith(val) && val !== '...') return val;
    } catch {}
    return null;
  };

  const id = String(item?.id || '');
  if (!id) return item?.name || '';

  const lookupId = id.toLowerCase();

  // Correctly construct the key for all scopes, e.g., "incomeCategories.salary" or "emotions.happy"
  const key = `${scope}.${lookupId}`;
  const translatedLabel = tryT(key);

  // If a translation is found, use it.
  // Otherwise, fall back to the name stored on the item (for user-defined categories),
  // or the ID itself as a last resort.
  return translatedLabel ?? (item?.name || id);
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
  // 将可能的科学计数转换为普通十进制字符串再转回数字，避免 1e±n
  const raw = Number.isFinite(amount) ? amount : 0;
  // 对极端值控制精度后再格式化（最多保留 6 位小数，常规显示 2 位）
  const abs = Math.abs(raw);
  const safeNum = (() => {
    // 转普通字符串（不使用 toExponential）
    if (abs !== 0 && (abs < 1e-6 || abs >= 1e12)) {
      // 对极小/极大数先定点到 6 位，再转数字，避免 Intl 触发科学计数
      const fixed = raw.toFixed(6);
      return Number(fixed);
    }
    return raw;
  })();

  const loc =
    locale ||
    ((Intl as any)?.DateTimeFormat?.().resolvedOptions?.().locale as string) ||
    'en';

  // 统一数值部分：最多两位小数（金额场景）
  const numberOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  // 对 USD 强制使用自定义符号，避免部分地区显示 US$
  if (norm === 'USD') {
    try {
      const num = new Intl.NumberFormat(loc, numberOptions).format(safeNum);
      const sym = SYMBOLS['USD'] || '$';
      return `${sym}${num}`;
    } catch {
      const sym = SYMBOLS['USD'] || '$';
      return `${sym}${safeNum.toFixed(2)}`;
    }
  }

  try {
    // 多数币种用 Intl 货币格式，但仍用固定两位小数，避免 1e±n
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: norm,
      ...numberOptions,
    }).format(safeNum);
  } catch {
    const sym = SYMBOLS[norm] || norm;
    return `${sym}${safeNum.toFixed(2)}`;
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