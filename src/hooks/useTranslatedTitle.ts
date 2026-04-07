import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

/**
 * Sets the navigation header title to a translated string.
 * Call from any screen: useTranslatedTitle('nav.gameSetup')
 */
export function useTranslatedTitle(key: string): void {
  const { t } = useTranslation();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: t(key) });
  }, [t, key, navigation]);
}
