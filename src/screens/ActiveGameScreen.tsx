// src/screens/ActiveGameScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, FlatList, TouchableOpacity, Text, StyleSheet, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game, Transaction } from '../types';
import { loadGames, updateGame } from '../storage';
import PlayerRow from '../components/PlayerRow';
import { v4 as uuidv4 } from 'uuid';

type Props = StackScreenProps<RootStackParamList, 'ActiveGame'>;

export default function ActiveGameScreen({ route, navigation }: Props) {
  const { gameId } = route.params;
  const [game, setGame] = useState<Game | null>(null);

  useFocusEffect(
    useCallback(() => {
      const found = loadGames().find(g => g.id === gameId) ?? null;
      setGame(found);
      if (found) {
        navigation.setOptions({ title: `Pot: $${pot(found).toFixed(2)}` });
      }
    }, [gameId, navigation]),
  );

  function pot(g: Game): number {
    return g.players.flatMap(p => p.transactions)
      .filter(t => t.type === 'buyin' || t.type === 'rebuy')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  function addTransaction(playerId: string, type: 'rebuy' | 'cashout', amount: number) {
    // Use functional updater to read current state — avoids stale closure
    // if two prompts somehow overlap (e.g. rapid double-tap on different players).
    setGame(prev => {
      if (!prev) return prev;
      const tx: Transaction = { id: uuidv4(), type, amount, timestamp: Date.now() };
      const updated: Game = {
        ...prev,
        players: prev.players.map(p =>
          p.id === playerId ? { ...p, transactions: [...p.transactions, tx] } : p,
        ),
      };
      updateGame(updated);
      navigation.setOptions({ title: `Pot: $${pot(updated).toFixed(2)}` });
      return updated;
    });
  }

  function promptAmount(title: string, onConfirm: (amount: number) => void) {
    Alert.prompt(
      title,
      'Enter amount:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: (value?: string) => {
            const amount = parseFloat(value ?? '');
            if (isNaN(amount) || amount <= 0) {
              Alert.alert('Enter a valid positive amount');
              return;
            }
            onConfirm(amount);
          },
        },
      ],
      'plain-text',
      '',
      'decimal-pad',
    );
  }

  function handleRebuy(playerId: string) {
    promptAmount('Rebuy', amount => addTransaction(playerId, 'rebuy', amount));
  }

  function handleCashOut(playerId: string) {
    promptAmount('Cash Out', amount => addTransaction(playerId, 'cashout', amount));
  }

  function handleEndGame() {
    Alert.alert('End Game', 'Are you sure you want to end the game?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Game',
        style: 'destructive',
        onPress: () => navigation.navigate('FinalChipCount', { gameId }),
      },
    ]);
  }

  if (!game) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={game.players}
        keyExtractor={p => p.id}
        renderItem={({ item }) => (
          <PlayerRow
            player={item}
            onRebuy={() => handleRebuy(item.id)}
            onCashOut={() => handleCashOut(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
      />
      <TouchableOpacity style={styles.endBtn} onPress={handleEndGame}>
        <Text style={styles.endBtnText}>End Game</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, paddingBottom: 100 },
  endBtn: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#e53935',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  endBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
