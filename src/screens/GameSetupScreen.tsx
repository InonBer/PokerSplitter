// src/screens/GameSetupScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game, Player, Transaction } from '../types';
import { saveGame } from '../storage';
import { v4 as uuidv4 } from 'uuid';

type Props = StackScreenProps<RootStackParamList, 'GameSetup'>;

interface PlayerEntry {
  name: string;
  buyIn: string; // string for TextInput; parsed on submit
}

export default function GameSetupScreen({ navigation }: Props) {
  const [players, setPlayers] = useState<PlayerEntry[]>([{ name: '', buyIn: '' }]);

  function addPlayer() {
    setPlayers(prev => [...prev, { name: '', buyIn: '' }]);
  }

  function updatePlayer(index: number, field: keyof PlayerEntry, value: string) {
    setPlayers(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function removePlayer(index: number) {
    setPlayers(prev => prev.filter((_, i) => i !== index));
  }

  function startGame() {
    if (players.length < 2) {
      Alert.alert('Need at least 2 players');
      return;
    }
    for (const p of players) {
      if (!p.name.trim()) {
        Alert.alert('All players need a name');
        return;
      }
      const amount = parseFloat(p.buyIn);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('All buy-in amounts must be positive numbers');
        return;
      }
    }

    // Guard against duplicate names (computeNets requires unique names)
    const names = players.map(p => p.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      Alert.alert('Duplicate names', 'All players must have unique names');
      return;
    }

    const gamePlayers: Player[] = players.map(p => {
      const buyInTx: Transaction = {
        id: uuidv4(),
        type: 'buyin',
        amount: parseFloat(p.buyIn),
        timestamp: Date.now(),
      };
      return { id: uuidv4(), name: p.name.trim(), transactions: [buyInTx] };
    });

    const game: Game = {
      id: uuidv4(),
      date: Date.now(),
      status: 'active',
      players: gamePlayers,
    };

    saveGame(game);
    navigation.replace('ActiveGame', { gameId: game.id });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={players}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <View style={styles.playerRow}>
            <TextInput
              style={[styles.input, styles.nameInput]}
              placeholder="Player name"
              value={item.name}
              onChangeText={v => updatePlayer(index, 'name', v)}
            />
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder="Buy-in $"
              value={item.buyIn}
              keyboardType="decimal-pad"
              onChangeText={v => updatePlayer(index, 'buyIn', v)}
            />
            {players.length > 2 && (
              <TouchableOpacity onPress={() => removePlayer(index)} style={styles.removeBtn}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          <TouchableOpacity style={styles.addBtn} onPress={addPlayer}>
            <Text style={styles.addBtnText}>+ Add Player</Text>
          </TouchableOpacity>
        }
      />
      <TouchableOpacity style={styles.startBtn} onPress={startGame}>
        <Text style={styles.startBtnText}>Start Game</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, paddingBottom: 100 },
  playerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  nameInput: { flex: 1, marginRight: 8 },
  amountInput: { width: 90, marginRight: 8 },
  removeBtn: { padding: 8 },
  removeText: { color: '#e53935', fontSize: 16 },
  addBtn: {
    alignItems: 'center',
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#1a73e8',
    borderRadius: 10,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addBtnText: { color: '#1a73e8', fontSize: 15, fontWeight: '600' },
  startBtn: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
