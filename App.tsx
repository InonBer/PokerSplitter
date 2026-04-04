// App.tsx
import 'react-native-get-random-values';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStackParamList } from './src/types';
import HomeScreen from './src/screens/HomeScreen';
import GameSetupScreen from './src/screens/GameSetupScreen';
import ActiveGameScreen from './src/screens/ActiveGameScreen';
import FinalChipCountScreen from './src/screens/FinalChipCountScreen';
import SettlementScreen from './src/screens/SettlementScreen';
import GameDetailScreen from './src/screens/GameDetailScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'PokerSplitter' }} />
          <Stack.Screen name="GameSetup" component={GameSetupScreen} options={{ title: 'New Game' }} />
          <Stack.Screen name="ActiveGame" component={ActiveGameScreen} options={{ title: 'Game' }} />
          <Stack.Screen name="FinalChipCount" component={FinalChipCountScreen} options={{ title: 'Chip Count' }} />
          <Stack.Screen name="Settlement" component={SettlementScreen} options={{ title: 'Settlement' }} />
          <Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ title: 'Game Detail' }} />
        </Stack.Navigator>
      </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
