// src/components/PlayerRow.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Player } from '../types';

interface Props {
  player: Player;
  onRebuy: () => void;
  onCashOut: () => void;
}

function totalIn(player: Player): number {
  return player.transactions
    .filter(t => t.type === 'buyin' || t.type === 'rebuy')
    .reduce((sum, t) => sum + t.amount, 0);
}

function hasCashedOut(player: Player): boolean {
  return player.transactions.some(t => t.type === 'cashout');
}

export default function PlayerRow({ player, onRebuy, onCashOut }: Props) {
  const cashedOut = hasCashedOut(player);
  const inAmount = totalIn(player);
  const rebuyCount = player.transactions.filter(t => t.type === 'rebuy').length;

  return (
    <View style={[styles.row, cashedOut && styles.rowDimmed]}>
      <View style={styles.info}>
        <Text style={styles.name}>{player.name}</Text>
        <Text style={styles.meta}>
          In: ${inAmount.toFixed(2)}{rebuyCount > 0 ? ` · ${rebuyCount} rebuy${rebuyCount > 1 ? 's' : ''}` : ''}
        </Text>
      </View>
      {cashedOut ? (
        <View style={styles.outBadge}>
          <Text style={styles.outText}>Out</Text>
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.rebuyBtn} onPress={onRebuy}>
            <Text style={styles.rebuyText}>Rebuy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cashOutBtn} onPress={onCashOut}>
            <Text style={styles.cashOutText}>Cash Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rowDimmed: { opacity: 0.45 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#111' },
  meta: { fontSize: 13, color: '#777', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  rebuyBtn: {
    backgroundColor: '#e8f0fe',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rebuyText: { color: '#1a73e8', fontWeight: '600', fontSize: 13 },
  cashOutBtn: {
    backgroundColor: '#fce8e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cashOutText: { color: '#e53935', fontWeight: '600', fontSize: 13 },
  outBadge: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  outText: { color: '#999', fontWeight: '600', fontSize: 13 },
});
