// src/screens/ActiveGameScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ActiveGameScreen() {
  return (
    <View style={styles.container}>
      <Text>ActiveGame</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
