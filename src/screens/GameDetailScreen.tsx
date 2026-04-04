// src/screens/GameDetailScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, SectionList, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game, Transfer } from '../types';
import { loadGames } from '../storage';
import { computeNets, computeTransfers } from '../settlement';
import TransferRow from '../components/TransferRow';

type Props = StackScreenProps<RootStackParamList, 'GameDetail'>;

export default function GameDetailScreen({ route }: Props) {
  const { gameId } = route.params;
  const [game, setGame] = useState<Game | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  useFocusEffect(
    useCallback(() => {
      const found = loadGames().find(g => g.id === gameId) ?? null;
      setGame(found);
      if (found) {
        const nets = computeNets(found.players);
        setTransfers(computeTransfers(nets));
      }
    }, [gameId]),
  );

  if (!game) return null;

  // computeNets returns Record<playerName, net> — keyed by name, not id.
  // This matches the settlement.ts implementation in Task 5.
  const nets = computeNets(game.players);
  const gameDate = new Date(game.date).toLocaleDateString();

  // Use a discriminated union so SectionList has a single item type.
  type PlayerItem = { key: string; type: 'player'; name: string; net: number };
  type TransferItem = { key: string; type: 'transfer'; transfer: Transfer };
  type SectionItem = PlayerItem | TransferItem;

  type Section = { title: string; data: SectionItem[] };

  const sections: Section[] = [
    {
      title: `Players · ${gameDate}`,
      data: game.players.map<SectionItem>(p => ({
        key: p.id,
        type: 'player',
        name: p.name,
        net: nets[p.name] ?? 0,
      })),
    },
    {
      title: 'Settlement',
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
  net: { fontSize: 17, fontWeight: '700' },
  netPos: { color: '#2e7d32' },
  netNeg: { color: '#e53935' },
});
