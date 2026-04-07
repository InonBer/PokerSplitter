import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';
import { storage } from '../storage';
import en from './locales/en.json';
import he from './locales/he.json';

export const USER_LANGUAGE_KEY = 'userLanguage';

// Resolve language: MMKV override > device locale > English fallback
function resolveLanguage(): 'en' | 'he' {
  const stored = storage.getString(USER_LANGUAGE_KEY);
  if (stored === 'en' || stored === 'he') return stored;

  const deviceLocale = getLocales()[0]?.languageCode ?? 'en';
  return deviceLocale.startsWith('he') ? 'he' : 'en';
}

const language = resolveLanguage();

// Set RTL synchronously before any component renders
I18nManager.allowRTL(true);
I18nManager.forceRTL(language === 'he');

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    he: { translation: he },
  },
  lng: language,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function formatLocalDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US');
}

export default i18n;
