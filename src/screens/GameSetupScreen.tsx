// src/screens/GameSetupScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GameSetupScreen() {
  return (
    <View style={styles.container}>
      <Text>GameSetup</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
