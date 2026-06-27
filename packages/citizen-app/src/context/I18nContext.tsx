/**
 * CivicMind — Lightweight i18n Context (NFR-5)
 * Supports English and Tamil. All citizen-facing UI strings go here.
 * Usage: const { t } = useI18n(); then t('key')
 */

import React, { createContext, useContext, useState } from 'react';

import en from '../locales/en.json';
import ta from '../locales/ta.json';
import hi from '../locales/hi.json';
import te from '../locales/te.json';
import ml from '../locales/ml.json';
import bn from '../locales/bn.json';
import kn from '../locales/kn.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'kn', name: 'ಕನ್ನಡ' }
];

export type Locale = 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'bn' | 'kn';

const strings: Record<string, any> = { en, ta, hi, te, ml, bn, kn };

type StringKey = keyof typeof en;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const LS_LOCALE_KEY = 'civicmind_locale';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(LS_LOCALE_KEY);
    return (saved ? saved : 'en') as Locale;
  });

  const setLocale = (l: Locale) => {
    localStorage.setItem(LS_LOCALE_KEY, l);
    setLocaleState(l);
  };

  const t = (key: StringKey, vars?: Record<string, string | number>): string => {
    let str: string = (strings[locale] as Record<string, string>)[key] ?? (strings.en as Record<string, string>)[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replaceAll(`{${k}}`, String(v));
      });
    }
    return str;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
