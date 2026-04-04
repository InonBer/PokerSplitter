// src/components/TransferRow.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Transfer } from '../types';

interface Props {
  transfer: Transfer;
}

export default function TransferRow({ transfer }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.from}>{transfer.from}</Text>
      <Text style={styles.arrow}> → </Text>
      <Text style={styles.to}>{transfer.to}</Text>
      <View style={styles.spacer} />
      <Text style={styles.amount}>${transfer.amount.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  from: { fontSize: 16, fontWeight: '600', color: '#e53935' },
  arrow: { fontSize: 16, color: '#999' },
  to: { fontSize: 16, fontWeight: '600', color: '#2e7d32' },
  spacer: { flex: 1 },
  amount: { fontSize: 18, fontWeight: '700', color: '#111' },
});
