// src/screens/SettlementScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SettlementScreen() {
  return (
    <View style={styles.container}>
      <Text>Settlement</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
