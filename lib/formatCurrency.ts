export type FormatCurrencyOptions = {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

/**
 * Unified currency formatter to avoid "CN¥", "US$" prefixes on iOS,
 * while keeping localized grouping and decimals.
 */
const SYMBOLS: Record<string, string> = {
  CNY: "¥",
  JPY: "¥",
  USD: "$",
  EUR: "€",
  GBP: "£",
  KRW: "₩",
  HKD: "HK$",
  TWD: "NT$",
  INR: "₹",
  RUB: "₽",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  THB: "฿",
  VND: "₫",
};

const PREFIX_NORMALIZE: Record<string, string> = {
  "CN¥": "¥",
  "JP¥": "¥",
  "US$": "$",
  "CA$": "C$",
  "AU$": "A$",
  "SG$": "S$",
  "HK$": "HK$",
  "NT$": "NT$",
  "KR₩": "₩",
};

export function formatCurrency(
  value: number,
  currency: string,
  options: FormatCurrencyOptions = {}
): string {
  const {
    locale = "zh-CN",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  try {
    const nf = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits,
      maximumFractionDigits,
    });
    let out = nf.format(value);

    // Normalize known prefixes like "CN¥", "US$"
    for (const [from, to] of Object.entries(PREFIX_NORMALIZE)) {
      if (out.startsWith(from)) {
        out = out.replace(from, to);
        break;
      }
    }

    // If still shows code or unexpected prefix, fall back to custom symbol + localized number
    const hasCodePrefix =
      out.startsWith(currency) || /^[A-Z]{2,3}[¥$€£]/.test(out);
    if (hasCodePrefix) {
      const symbol = SYMBOLS[currency] ?? currency;
      const num = new Intl.NumberFormat(locale, {
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(value);
      // For zh/ja/ko style put symbol before number without space
      const noSpaceLocales = ["zh", "ja", "ko"];
      const needsNoSpace = noSpaceLocales.some((l) => locale.startsWith(l));
      return needsNoSpace ? `${symbol}${num}` : `${symbol}${num}`;
    }

    // Remove inadvertent space between symbol and number for CJK locales
    if (/^(zh|ja|ko)/.test(locale)) {
      out = out.replace(/^([¥€£$])\s+/, "$1");
      out = out.replace(/^(HK\$|NT\$|A\$|C\$|S\$)\s+/, "$1");
    }

    return out;
  } catch {
    const symbol = SYMBOLS[currency] ?? currency;
    const num = new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
    return `${symbol}${num}`;
  }
}

export default formatCurrency;