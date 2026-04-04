// src/screens/SettlementScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Transfer } from '../types';
import { loadGames, updateGame } from '../storage';
import { computeNets, computeTransfers } from '../settlement';
import TransferRow from '../components/TransferRow';

type Props = StackScreenProps<RootStackParamList, 'Settlement'>;

export default function SettlementScreen({ route, navigation }: Props) {
  const { gameId } = route.params;
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [pot, setPot] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const game = loadGames().find(g => g.id === gameId);
      if (!game) return;

      // Mark as finished if not already
      if (game.status !== 'finished') {
        updateGame({ ...game, status: 'finished' });
      }

      const totalPot = game.players.flatMap(p => p.transactions)
        .filter(t => t.type === 'buyin' || t.type === 'rebuy')
        .reduce((sum, t) => sum + t.amount, 0);

      const nets = computeNets(game.players);
      const result = computeTransfers(nets);
      setPot(totalPot);
      setTransfers(result);

      // Hide back button — "Done" resets the stack to Home.
      // FinalChipCountScreen already called updateGame() with finalChips before navigating here.
      navigation.setOptions({ headerLeft: () => null });
    }, [gameId, navigation]),
  );

  async function handleShare() {
    const lines = transfers.length === 0
      ? ['No transfers needed — everyone broke even!']
      : transfers.map(t => `${t.from} → ${t.to}: $${t.amount.toFixed(2)}`);
    const message = `Poker Settlement\n\n${lines.join('\n')}\n\nTotal pot: $${pot.toFixed(2)}`;
    await Share.share({ message });
  }

  function handleDone() {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

  return (
    <View style={styles.container}>
      {transfers.length === 0 ? (
        <View style={styles.evenContainer}>
          <Text style={styles.evenText}>No transfers needed!</Text>
          <Text style={styles.evenSub}>Everyone broke even.</Text>
        </View>
      ) : (
        <FlatList
          data={transfers}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <TransferRow transfer={item} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.header}>
              {transfers.length} transfer{transfers.length !== 1 ? 's' : ''} · Total pot ${pot.toFixed(2)}
            </Text>
          }
        />
      )}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Share Results</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, paddingBottom: 160 },
  header: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 16 },
  evenContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  evenText: { fontSize: 22, fontWeight: '700', color: '#2e7d32' },
  evenSub: { fontSize: 15, color: '#777', marginTop: 8 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    gap: 10,
  },
  shareBtn: {
    backgroundColor: '#2e7d32',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  doneBtn: {
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
