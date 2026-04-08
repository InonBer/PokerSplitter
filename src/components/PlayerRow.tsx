// src/components/PlayerRow.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Player } from '../types';

interface Props {
  player: Player;
  onRebuy: () => void;
  onCashOut: () => void;
  onPress?: () => void;
  chipMultiplier?: number;
}

function totalIn(player: Player): number {
  return player.transactions
    .filter(t => t.type === 'buyin' || t.type === 'rebuy')
    .reduce((sum, t) => sum + t.amount, 0);
}

function hasCashedOut(player: Player): boolean {
  return player.transactions.some(t => t.type === 'cashout');
}

export default function PlayerRow({ player, onRebuy, onCashOut, onPress, chipMultiplier }: Props) {
  const { t } = useTranslation();
  const cashedOut = hasCashedOut(player);
  const inAmount = totalIn(player);
  const rebuyCount = player.transactions.filter(t => t.type === 'rebuy').length;
  const chips = chipMultiplier ? Math.round(inAmount * chipMultiplier) : null;

  return (
    <Pressable style={[styles.row, cashedOut && styles.rowDimmed]} onPress={onPress}>
      <View style={styles.topRow}>
        <Text style={styles.name}>{player.name}</Text>
        {cashedOut ? (
          <View style={styles.outBadge}>
            <Text style={styles.outText}>{t('player.out')}</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.rebuyBtn} onPress={onRebuy}>
              <Text style={styles.rebuyText}>{t('player.rebuyBtn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cashOutBtn} onPress={onCashOut}>
              <Text style={styles.cashOutText}>{t('player.cashOutBtn')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <Text style={styles.meta}>
        {t('player.in', { amount: '' })}<Text style={styles.metaBold}>{inAmount.toFixed(2)}</Text>{chips != null ? ` ${t('player.chips', { chips })}` : ''}{rebuyCount > 0 ? ` · ${t('player.rebuy', { count: rebuyCount })}` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rowDimmed: { opacity: 0.45 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontSize: 16, fontWeight: '600', color: '#111', flex: 1, marginEnd: 12, textAlign: 'left' },
  meta: { fontSize: 13, color: '#777', marginTop: 6, textAlign: 'left' },
  metaBold: { fontWeight: '700', color: '#333' },
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
