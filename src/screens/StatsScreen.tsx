// src/screens/StatsScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useTranslation } from 'react-i18next';
import { loadGames } from '../storage';
import { computeStats, PlayerStat } from '../utils/stats';
import { useTranslatedTitle } from '../hooks/useTranslatedTitle';

type Props = StackScreenProps<RootStackParamList, 'Stats'>;

function formatNet(n: number): string {
  if (n > 0) return `+$${n.toFixed(2)}`;
  if (n < 0) return `-$${Math.abs(n).toFixed(2)}`;
  return '$0.00';
}

export default function StatsScreen(_: Props) {
  const { t } = useTranslation();
  useTranslatedTitle('nav.stats');
  const [stats, setStats] = useState<PlayerStat[]>([]);

  useFocusEffect(
    useCallback(() => {
      setStats(computeStats(loadGames()));
    }, []),
  );

  return (
    <View style={styles.container}>
      <View style={styles.tableHeader}>
        <Text style={[styles.col, styles.colName]}>{t('stats.player')}</Text>
        <Text style={styles.col}>{t('stats.games')}</Text>
        <Text style={styles.col}>{t('stats.total')}</Text>
        <Text style={styles.col}>{t('stats.bestWin')}</Text>
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
          <Text style={styles.empty}>{t('stats.empty')}</Text>
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
  col: { flex: 1, fontSize: 14, color: '#333', textAlign: 'right', writingDirection: 'ltr' },
  colName: { flex: 2, textAlign: 'left', fontWeight: '600' },
  green: { color: '#2e7d32', fontWeight: '600' },
  red: { color: '#c62828', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#999', padding: 32, fontSize: 14 },
});
