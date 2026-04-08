// src/screens/ActiveGameScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, FlatList, TouchableOpacity, Text, StyleSheet, Alert, Platform,
  Modal, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game, Player, Transaction } from '../types';
import { loadGames, updateGame } from '../storage';
import PlayerRow from '../components/PlayerRow';
import AmountModal from '../components/AmountModal';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';

type Props = StackScreenProps<RootStackParamList, 'ActiveGame'>;

export default function ActiveGameScreen({ route, navigation }: Props) {
  const { gameId } = route.params;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [game, setGame] = useState<Game | null>(null);
  const [modal, setModal] = useState<{ title: string; onConfirm: (n: number) => void } | null>(null);
  const [historyPlayer, setHistoryPlayer] = useState<Player | null>(null);

  useFocusEffect(
    useCallback(() => {
      const found = loadGames().find(g => g.id === gameId) ?? null;
      setGame(found);
      if (found) {
        navigation.setOptions({ title: found.name ?? t('nav.activeGame') });
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
      return updated;
    });
  }

  function promptAmount(title: string, onConfirm: (amount: number) => void) {
    if (Platform.OS === 'ios' && !game?.chipMultiplier) {
      Alert.prompt(title, t('activeGame.enterAmount'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: (value?: string) => {
            const amount = parseFloat(value ?? '');
            if (isNaN(amount) || amount <= 0) {
              Alert.alert(t('activeGame.invalidAmount'));
              return;
            }
            onConfirm(amount);
          },
        },
      ], 'plain-text', '', 'decimal-pad');
    } else {
      setModal({ title, onConfirm });
    }
  }

  function handleRebuy(playerId: string) {
    promptAmount(t('activeGame.rebuy'), amount => addTransaction(playerId, 'rebuy', amount));
  }

  function handleCashOut(playerId: string) {
    promptAmount(t('activeGame.cashOut'), amount => addTransaction(playerId, 'cashout', amount));
  }

  function txLabel(type: string): string {
    if (type === 'buyin') return t('player.buyin');
    if (type === 'rebuy') return t('player.rebuyLabel');
    return t('player.cashoutLabel');
  }

  function handleDeleteTransaction(playerId: string, txId: string, tx: Transaction) {
    Alert.alert(t('player.deleteTransaction'), t('player.deleteTransactionMsg', { amount: tx.amount.toFixed(2), type: txLabel(tx.type) }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: () => {
          setGame(prev => {
            if (!prev) return prev;
            const updated: Game = {
              ...prev,
              players: prev.players.map(p =>
                p.id === playerId
                  ? { ...p, transactions: p.transactions.filter(t => t.id !== txId) }
                  : p,
              ),
            };
            updateGame(updated);
            const updatedPlayer = updated.players.find(p => p.id === playerId);
            if (updatedPlayer) setHistoryPlayer(updatedPlayer);
            return updated;
          });
        },
      },
    ]);
  }

  function handleEndGame() {
    Alert.alert(t('activeGame.endGame'), t('activeGame.endGameConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('activeGame.endGame'),
        style: 'destructive',
        onPress: () => navigation.navigate('FinalChipCount', { gameId }),
      },
    ]);
  }

  function formatNumber(n: number): string {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
            onPress={() => setHistoryPlayer(item)}
            chipMultiplier={game.chipMultiplier}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
        ListHeaderComponent={
          <View style={styles.potBanner}>
            <Text style={styles.potText}>{t('activeGame.pot', { amount: formatNumber(pot(game)) })}</Text>
            {game.chipMultiplier ? (
              <Text style={styles.potChips}>{Math.round(pot(game) * game.chipMultiplier).toLocaleString()} ◉ · x{game.chipMultiplier}</Text>
            ) : null}
          </View>
        }
      />
      <TouchableOpacity style={[styles.endBtn, { bottom: 24 + insets.bottom }]} onPress={handleEndGame}>
        <Text style={styles.endBtnText}>{t('activeGame.endGame')}</Text>
      </TouchableOpacity>
      {modal && (
        <AmountModal
          visible
          title={modal.title}
          onConfirm={amount => { modal.onConfirm(amount); setModal(null); }}
          onCancel={() => setModal(null)}
          chipMultiplier={game.chipMultiplier}
        />
      )}

      <Modal visible={historyPlayer !== null} transparent animationType="fade" onRequestClose={() => setHistoryPlayer(null)}>
        <View style={hStyles.overlay}>
          <View style={hStyles.box}>
            <Text style={hStyles.title}>{historyPlayer?.name} — {t('player.history')}</Text>
            <ScrollView style={hStyles.list}>
              {historyPlayer?.transactions.map((tx, i) => (
                <View key={tx.id} style={hStyles.row}>
                  <View>
                    <Text style={hStyles.txType}>{txLabel(tx.type)}</Text>
                    <Text style={hStyles.txAmount}>{tx.amount.toFixed(2)}</Text>
                  </View>
                  {i === 0 && tx.type === 'buyin' ? null : (
                    <TouchableOpacity
                      onPress={() => handleDeleteTransaction(historyPlayer!.id, tx.id, tx)}
                      style={hStyles.deleteBtn}
                    >
                      <Text style={hStyles.deleteText}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={hStyles.closeBtn} onPress={() => setHistoryPlayer(null)}>
              <Text style={hStyles.closeBtnText}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16 },
  potBanner: { alignItems: 'center', marginBottom: 14 },
  potText: { fontSize: 18, fontWeight: '700', color: '#111', writingDirection: 'ltr' },
  potChips: { fontSize: 13, color: '#777', marginTop: 4 },
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

const hStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  box: {
    backgroundColor: '#fff', borderRadius: 14, padding: 24,
    width: '85%', maxHeight: '70%',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 16 },
  list: { marginBottom: 16 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0',
  },
  txType: { fontSize: 14, color: '#555' },
  txAmount: { fontSize: 16, fontWeight: '600', color: '#111', marginTop: 2 },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fce8e6', borderRadius: 8 },
  deleteText: { color: '#e53935', fontSize: 13, fontWeight: '600' },
  closeBtn: {
    backgroundColor: '#1a73e8', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
