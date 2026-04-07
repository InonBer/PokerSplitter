// src/utils/proGate.ts
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

/**
 * If isPro is false, navigates to the PaywallScreen and returns false.
 * Otherwise returns true so the caller can proceed with the Pro action.
 */
export function requirePro(
  isPro: boolean,
  navigation: NavigationProp<RootStackParamList>,
): boolean {
  if (!isPro) {
    navigation.navigate('Paywall');
    return false;
  }
  return true;
}
