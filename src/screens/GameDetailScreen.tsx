// src/screens/GameDetailScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, SectionList, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game, Transfer } from '../types';
import { loadGames } from '../storage';
import { computeNets, computeTransfers } from '../settlement';
import TransferRow from '../components/TransferRow';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useProStatus } from '../hooks/useProStatus';
import { requirePro } from '../utils/proGate';
import { generateSingleGameCSV } from '../utils/csvExport';
import { useTranslation } from 'react-i18next';
import { formatLocalDate } from '../i18n';

type Props = StackScreenProps<RootStackParamList, 'GameDetail'>;

export default function GameDetailScreen({ route, navigation }: Props) {
  const { gameId } = route.params;
  const [game, setGame] = useState<Game | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const isPro = useProStatus();
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      const found = loadGames().find(g => g.id === gameId) ?? null;
      setGame(found);
      if (found) {
        const nets = computeNets(found.players);
        setTransfers(computeTransfers(nets));
        navigation.setOptions({ title: found.name ?? formatLocalDate(found.date) });
      }
    }, [gameId, navigation]),
  );

  async function handleExport() {
    if (!requirePro(isPro, navigation)) return;
    const csv = generateSingleGameCSV(game!);
    const path = `${FileSystem.cacheDirectory}game-${gameId}.csv`;
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path);
  }

  if (!game) return null;

  // computeNets returns Record<playerName, net> — keyed by name, not id.
  // This matches the settlement.ts implementation in Task 5.
  const nets = computeNets(game.players);
  const gameDate = formatLocalDate(game.date);

  // Use a discriminated union so SectionList has a single item type.
  type PlayerItem = { key: string; type: 'player'; name: string; net: number };
  type TransferItem = { key: string; type: 'transfer'; transfer: Transfer };
  type SectionItem = PlayerItem | TransferItem;

  type Section = { title: string; data: SectionItem[] };

  const sections: Section[] = [
    {
      title: t('gameDetail.players', { date: gameDate }),
      data: game.players.map<SectionItem>(p => ({
        key: p.id,
        type: 'player',
        name: p.name,
        net: nets[p.name] ?? 0,
      })),
    },
    {
      title: t('gameDetail.settlement'),
      data: transfers.map<SectionItem>((t, i) => ({
        key: String(i),
        type: 'transfer',
        transfer: t,
      })),
    },
  ];

  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.key}
      contentContainerStyle={styles.list}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) => {
        if (item.type === 'player') {
          const isWinner = item.net > 0;
          return (
            <View style={styles.playerRow}>
              <Text style={styles.playerName}>{item.name}</Text>
              <Text style={[styles.net, isWinner ? styles.netPos : styles.netNeg]}>
                {isWinner ? '+' : ''}${item.net.toFixed(2)}
              </Text>
            </View>
          );
        }
        return <TransferRow transfer={item.transfer} />;
      }}
      ListFooterComponent={
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Text style={styles.exportBtnText}>{t('gameDetail.exportCsv')} {!isPro && '(Pro)'}</Text>
        </TouchableOpacity>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#777',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  playerRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  playerName: { fontSize: 16, fontWeight: '600', color: '#111' },
  net: { fontSize: 17, fontWeight: '700', writingDirection: 'ltr' },
  netPos: { color: '#2e7d32' },
  netNeg: { color: '#e53935' },
  exportBtn: {
    margin: 16, backgroundColor: '#f5f5f5', borderRadius: 10,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ddd',
  },
  exportBtnText: { color: '#555', fontSize: 15 },
});
