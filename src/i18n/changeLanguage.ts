import { Alert, I18nManager } from 'react-native';
import { storage } from '../storage';
import i18n, { USER_LANGUAGE_KEY } from './index';
import RNRestart from 'react-native-restart';

export type AppLanguage = 'en' | 'he';

export function getCurrentLanguage(): AppLanguage {
  return (i18n.language as AppLanguage) ?? 'en';
}

export function changeAppLanguage(newLang: AppLanguage): void {
  if (newLang === getCurrentLanguage()) return;

  storage.set(USER_LANGUAGE_KEY, newLang);
  i18n.changeLanguage(newLang);
  I18nManager.forceRTL(newLang === 'he');

  Alert.alert(
    i18n.t('settings.languageChanged'),
    i18n.t('settings.languageChangedMsg'),
    [{ text: 'OK', onPress: () => RNRestart.restart() }],
  );
}
