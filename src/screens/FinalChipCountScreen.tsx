// src/screens/FinalChipCountScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game } from '../types';
import { loadGames, updateGame } from '../storage';

type Props = StackScreenProps<RootStackParamList, 'FinalChipCount'>;

export default function FinalChipCountScreen({ route, navigation }: Props) {
  const { gameId } = route.params;
  const [game, setGame] = useState<Game | null>(null);
  const [chipCounts, setChipCounts] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      const found = loadGames().find(g => g.id === gameId) ?? null;
      setGame(found);
    }, [gameId]),
  );

  if (!game) return null;

  const activePlayers = game.players.filter(
    p => !p.transactions.some(t => t.type === 'cashout'),
  );

  function totalPot(): number {
    return game!.players.flatMap(p => p.transactions)
      .filter(t => t.type === 'buyin' || t.type === 'rebuy')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  function totalCashedOut(): number {
    return game!.players.flatMap(p => p.transactions)
      .filter(t => t.type === 'cashout')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  function expectedChips(): number {
    return totalPot() - totalCashedOut();
  }

  function enteredTotal(): number {
    return Object.values(chipCounts)
      .map(v => parseFloat(v) || 0)
      .reduce((a, b) => a + b, 0);
  }

  function handleCalculate() {
    for (const p of activePlayers) {
      const val = parseFloat(chipCounts[p.id] ?? '');
      if (isNaN(val) || val < 0) {
        Alert.alert('Enter chip counts', `Missing or invalid amount for ${p.name}`);
        return;
      }
    }

    const entered = Math.round(enteredTotal() * 100);
    const expected = Math.round(expectedChips() * 100);

    if (entered !== expected) {
      Alert.alert(
        'Chip count mismatch',
        `Total entered: $${(entered / 100).toFixed(2)}\nExpected: $${(expected / 100).toFixed(2)}\n\nPlease recount and try again.`,
      );
      return;
    }

    // Save final chip counts — SettlementScreen reads these from storage
    const updated: Game = {
      ...game!,
      players: game!.players.map(p => {
        const chips = parseFloat(chipCounts[p.id] ?? '');
        return isNaN(chips) ? p : { ...p, finalChips: chips };
      }),
    };
    updateGame(updated);
    navigation.navigate('Settlement', { gameId });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={activePlayers}
        keyExtractor={p => p.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <TextInput
              style={styles.input}
              placeholder="Chips $"
              keyboardType="decimal-pad"
              value={chipCounts[item.id] ?? ''}
              onChangeText={v => setChipCounts(prev => ({ ...prev, [item.id]: v }))}
            />
          </View>
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.hint}>
            Expected total: ${expectedChips().toFixed(2)}
          </Text>
        }
      />
      <TouchableOpacity style={styles.calcBtn} onPress={handleCalculate}>
        <Text style={styles.calcBtnText}>Calculate Settlement</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, paddingBottom: 100 },
  hint: { fontSize: 14, color: '#555', marginBottom: 16, textAlign: 'center' },
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
  name: { fontSize: 16, fontWeight: '600', color: '#111' },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    width: 110,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  calcBtn: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  calcBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
