// src/screens/StatsScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { loadGames } from '../storage';
import { computeStats, PlayerStat } from '../utils/stats';

type Props = StackScreenProps<RootStackParamList, 'Stats'>;

function formatNet(n: number): string {
  if (n > 0) return `+$${n.toFixed(2)}`;
  if (n < 0) return `-$${Math.abs(n).toFixed(2)}`;
  return '$0.00';
}

export default function StatsScreen(_: Props) {
  const [stats, setStats] = useState<PlayerStat[]>([]);

  useFocusEffect(
    useCallback(() => {
      setStats(computeStats(loadGames()));
    }, []),
  );

  return (
    <View style={styles.container}>
      <View style={styles.tableHeader}>
        <Text style={[styles.col, styles.colName]}>Player</Text>
        <Text style={styles.col}>Games</Text>
        <Text style={styles.col}>Total</Text>
        <Text style={styles.col}>Best Win</Text>
      </View>
      <FlatList
        data={stats}
        keyExtractor={s => s.name}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={[styles.col, styles.colName]} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.col}>{item.gamesPlayed}</Text>
            <Text style={[styles.col, item.totalNet >= 0 ? styles.green : styles.red]}>
              {formatNet(item.totalNet)}
            </Text>
            <Text style={styles.col}>${item.biggestWin.toFixed(2)}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No finished games yet — stats appear after your first settled game.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { paddingBottom: 40 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#ebebeb',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  row: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: '#f0f0f0',
  },
  col: { flex: 1, fontSize: 14, color: '#333', textAlign: 'right' },
  colName: { flex: 2, textAlign: 'left', fontWeight: '600' },
  green: { color: '#2e7d32', fontWeight: '600' },
  red: { color: '#c62828', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#999', padding: 32, fontSize: 14 },
});
