import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import enPack from '@/assets/i18n/en/common.json';
import zhPack from '@/assets/i18n/zh/common.json';
import esPack from '@/assets/i18n/es/common.json';
import frPack from '@/assets/i18n/fr/common.json';
import dePack from '@/assets/i18n/de/common.json';
import jaPack from '@/assets/i18n/ja/common.json';
import koPack from '@/assets/i18n/ko/common.json';

const LANGUAGE_STORAGE_KEY = '@expense_tracker_language';
export const SUPPORTED_LANGUAGES = ['en','zh','es','fr','de','ja','ko'] as const;
export type LangCode = typeof SUPPORTED_LANGUAGES[number];

const RES_PACKS: Record<LangCode, any> = {
  en: enPack,
  zh: zhPack,
  es: esPack,
  fr: frPack,
  de: dePack,
  ja: jaPack,
  ko: koPack,
};

// Helper to resolve nested keys from a language pack (e.g., "common.home")
function resolveFromPack(pack: any, key: string): string | undefined {
  try {
    // 1. Attempt to resolve dot-separated path
    const byPath = key.split('.').reduce<any>((obj, seg) => (obj && typeof obj === 'object' ? obj[seg] : undefined), pack);
    if (typeof byPath === 'string') return byPath;

    // 2. Fallback for flat keys within common sections (backward compatibility)
    if (pack?.common && typeof pack.common[key] === 'string') return pack.common[key];
    
    // 3. Fallback for root-level flat keys
    if (typeof (pack as any)[key] === 'string') return (pack as any)[key];

    // 4. Fallback search in common top-level sections
    const sections = ['auth','transactionsPage','accounts','categories','emotionsPage','emotions','expenseCategories','incomeCategories','warm'];
    for (const sec of sections) {
      const secObj = (pack as any)[sec];
      if (secObj && typeof secObj[key] === 'string') return secObj[key];
    }
  } catch {}
  return undefined;
}

const REGION_TO_CURRENCY: Record<string, string> = {
  CN: 'CNY', US: 'USD', JP: 'JPY', KR: 'KRW', DE: 'EUR', FR: 'EUR', ES: 'EUR',
  IT: 'EUR', NL: 'EUR', BE: 'EUR', PT: 'EUR', IE: 'EUR', AT: 'EUR', FI: 'EUR',
  GR: 'EUR', LU: 'EUR', MT: 'EUR', CY: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR',
  SK: 'EUR', SI: 'EUR', GB: 'GBP', HK: 'HKD', TW: 'TWD', SG: 'SGD', CA: 'CAD',
  AU: 'AUD', NZ: 'NZD', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', IN: 'INR',
  RU: 'RUB', BR: 'BRL', MX: 'MXN', AR: 'ARS'
};

const inferRegion = (locs: Localization.Locale[]): string => {
  const loc = locs?.[0];
  if (!loc) return '';
  let r = loc.regionCode || '';
  r = (r || '').toUpperCase();
  if (!r && typeof loc.languageTag === 'string') {
    const parts = loc.languageTag.split('-');
    if (parts.length >= 2) r = parts[1].toUpperCase();
  }
  return r;
};

const inferLanguageCode = (locs: Localization.Locale[]): LangCode => {
  const loc = locs?.[0];
  let code = '';
  if (loc) {
    code = loc.languageCode || '';
    if (!code && typeof loc.languageTag === 'string') {
      code = loc.languageTag.split('-')[0];
    }
  }
  code = (code || '').toLowerCase();
  const fallback: LangCode = 'en';
  const supported = new Set(SUPPORTED_LANGUAGES as readonly string[]);
  return (supported.has(code) ? (code as LangCode) : fallback);
};

interface LanguageContextType {
  language: LangCode;
  setLanguage: (lang: LangCode) => void;
  /** @deprecated Please use currency from a more appropriate context (e.g., useTransactions) */
  currency: string;
  /** @deprecated Please use a centralized currency setter (e.g., useTransactions().setCurrency) */
  setCurrency: (code: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [language, setLanguageState] = useState<LangCode>('en');
  const [currency, setCurrencyState] = useState<string>('USD');

  useEffect(() => {
    (async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        const savedCurrency = await AsyncStorage.getItem('@expense_tracker_currency'); // Assuming this key
        const locales = Localization.getLocales();

        // Set language
        if (savedLanguage && (SUPPORTED_LANGUAGES as readonly string[]).includes(savedLanguage)) {
          setLanguageState(savedLanguage as LangCode);
        } else {
          const inferredLang = inferLanguageCode(locales);
          setLanguageState(inferredLang);
        }

        // Set currency
        if (savedCurrency) {
          setCurrencyState(savedCurrency);
        } else {
          const region = inferRegion(locales);
          setCurrencyState(REGION_TO_CURRENCY[region] ?? 'USD');
        }
      } catch (error) {
        console.error('Failed to load language or currency from storage:', error);
        // Fallback to defaults
        setLanguageState(inferLanguageCode(Localization.getLocales()));
        setCurrencyState(REGION_TO_CURRENCY[inferRegion(Localization.getLocales())] ?? 'USD');
      }
    })();
  }, []);

  const setLanguage = useCallback(async (lang: LangCode) => {
    try {
      if (SUPPORTED_LANGUAGES.includes(lang)) {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
        setLanguageState(lang);
      }
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  }, []);

  const setCurrency = useCallback(async (code: string) => {
    try {
      await AsyncStorage.setItem('@expense_tracker_currency', code);
      setCurrencyState(code);
    } catch (error) {
      console.error('Failed to save currency:', error);
    }
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    // Priority: Current Language -> English (fallback) -> Key
    const translation = resolveFromPack(RES_PACKS[language], key) ?? resolveFromPack(RES_PACKS.en, key) ?? key;

    if (vars && translation) {
      return Object.entries(vars).reduce((acc, [k, v]) => {
        return acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }, translation);
    }
    return translation;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, currency, setCurrency, t }), [language, currency, setLanguage, setCurrency, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;