// src/screens/FinalChipCountScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FinalChipCountScreen() {
  return (
    <View style={styles.container}>
      <Text>FinalChipCount</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
