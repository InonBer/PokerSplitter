import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../src/i18n/locales/en.json';

// Initialize i18next for tests — this avoids importing the real src/i18n/index.ts
// which would pull in storage.ts → react-native-mmkv → native modules.
i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
