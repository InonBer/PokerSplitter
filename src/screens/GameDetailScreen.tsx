// src/screens/GameDetailScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GameDetailScreen() {
  return (
    <View style={styles.container}>
      <Text>GameDetail</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
