// src/screens/HomeScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game } from '../types';
import { loadGames } from '../storage';
import { useProStatus } from '../hooks/useProStatus';
import { requirePro } from '../utils/proGate';
import { useTranslation } from 'react-i18next';
import { formatLocalDate } from '../i18n';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

const FREE_GAME_LIMIT = 3;

export default function HomeScreen({ navigation }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const isPro = useProStatus();
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      const all = loadGames().sort((a, b) => b.date - a.date);
      setGames(all);
    }, []),
  );

  function handleNewGame() {
    if (!isPro && games.length >= FREE_GAME_LIMIT) {
      navigation.navigate('Paywall');
      return;
    }
    navigation.navigate('GameSetup');
  }

  function handleGamePress(game: Game) {
    if (game.status === 'active') {
      navigation.navigate('ActiveGame', { gameId: game.id });
    } else {
      navigation.navigate('GameDetail', { gameId: game.id });
    }
  }

  function gameCountIndicator(): string | null {
    if (isPro || games.length > FREE_GAME_LIMIT) return null;
    if (games.length === FREE_GAME_LIMIT) return t('home.gamesUsedMax', { limit: FREE_GAME_LIMIT });
    return t('home.gamesUsed', { count: games.length, limit: FREE_GAME_LIMIT });
  }

  const indicator = gameCountIndicator();

  function renderItem({ item }: ListRenderItemInfo<Game>) {
    const date = item.name ?? formatLocalDate(item.date);
    const playerCount = item.players.length;
    const isActive = item.status === 'active';
    return (
      <TouchableOpacity
        style={[styles.row, isActive && styles.activeRow]}
        onPress={() => handleGamePress(item)}
      >
        <View>
          <Text style={styles.rowTitle}>{date}</Text>
          <Text style={styles.rowMeta}>{t('home.players', { count: playerCount })} · {isActive ? t('home.active') : t('home.finished')}</Text>
        </View>
        <Text style={[styles.chevron, isActive && styles.activeChevron]}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {indicator ? <Text style={styles.indicator}>{indicator}</Text> : null}
      <FlatList
        data={games}
        keyExtractor={g => g.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('home.noGames')}</Text>}
      />
      <TouchableOpacity style={styles.fab} onPress={handleNewGame}>
        <Text style={styles.fabText}>{t('home.newGame')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  indicator: {
    textAlign: 'center', fontSize: 12, color: '#e65100',
    paddingVertical: 8, backgroundColor: '#fff3e0',
  },
  list: { padding: 16, paddingBottom: 80 },
  row: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  activeRow: { borderWidth: 1.5, borderColor: '#4CAF50' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  rowMeta: { fontSize: 13, color: '#777', marginTop: 2 },
  chevron: { fontSize: 22, color: '#ccc' },
  activeChevron: { color: '#4CAF50' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 24, left: 20, right: 20,
    backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
