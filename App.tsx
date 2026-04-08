// App.tsx
import 'react-native-get-random-values';
import './src/i18n';
import React from 'react';
import { Platform, TouchableOpacity, Text, I18nManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { RootStackParamList } from './src/types';
import HomeScreen from './src/screens/HomeScreen';
import GameSetupScreen from './src/screens/GameSetupScreen';
import ActiveGameScreen from './src/screens/ActiveGameScreen';
import FinalChipCountScreen from './src/screens/FinalChipCountScreen';
import SettlementScreen from './src/screens/SettlementScreen';
import GameDetailScreen from './src/screens/GameDetailScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import { useTranslation } from 'react-i18next';

// Configure RevenueCat at module scope — must run before any component mounts
// so that useProStatus()'s getCustomerInfo() call on first render is valid.
const _rcApiKey = Platform.OS === 'ios'
  ? process.env.EXPO_PUBLIC_RC_IOS_KEY ?? ''
  : process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? '';
if (_rcApiKey) {
  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  Purchases.configure({ apiKey: _rcApiKey });
}

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const { t } = useTranslation();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Home">
            <Stack.Screen name="Home" component={HomeScreen}
              options={({ navigation }) => ({
                title: t('nav.home'),
                headerLeft: () => (
                  <HeaderBtn label={I18nManager.isRTL ? '\u2699\uFE0E' : t('home.stats')} onPress={() => navigation.navigate(I18nManager.isRTL ? 'Settings' : 'Stats')} size={I18nManager.isRTL ? 22 : undefined} />
                ),
                headerRight: () => (
                  <HeaderBtn label={I18nManager.isRTL ? t('home.stats') : '\u2699\uFE0E'} onPress={() => navigation.navigate(I18nManager.isRTL ? 'Stats' : 'Settings')} size={I18nManager.isRTL ? undefined : 22} />
                ),
              })}
            />
            <Stack.Screen name="GameSetup" component={GameSetupScreen} options={{ title: 'New Game' }} />
            <Stack.Screen name="ActiveGame" component={ActiveGameScreen} options={{ title: 'Game' }} />
            <Stack.Screen name="FinalChipCount" component={FinalChipCountScreen} options={{ title: 'Chip Count' }} />
            <Stack.Screen name="Settlement" component={SettlementScreen} options={{ title: 'Settlement' }} />
            <Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ title: 'Game Detail' }} />
            <Stack.Screen name="Paywall" component={PaywallScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Stats" component={StatsScreen} options={{ title: 'All-Time Stats' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
            <Stack.Screen name="Contacts" component={ContactsScreen} options={{ title: 'Contacts' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function HeaderBtn({ label, onPress, size }: { label: string; onPress: () => void; size?: number }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 10 }}>
      <Text style={{ color: '#1a73e8', fontSize: size ?? 15 }}>{label}</Text>
    </TouchableOpacity>
  );
}
