// src/screens/GameSetupScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game, Player, Transaction, Contact } from '../types';
import { saveGame, loadContacts } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import { useProStatus } from '../hooks/useProStatus';
import { requirePro } from '../utils/proGate';
import ContactPickerModal from '../components/ContactPickerModal';
import { useTranslation } from 'react-i18next';
import { useTranslatedTitle } from '../hooks/useTranslatedTitle';

type Props = StackScreenProps<RootStackParamList, 'GameSetup'>;

interface PlayerEntry {
  id: string;
  name: string;
  buyIn: string;
  phone?: string; // from linked contact
}

const newEntry = (): PlayerEntry => ({ id: uuidv4(), name: '', buyIn: '' });

export default function GameSetupScreen({ navigation }: Props) {
  const { t } = useTranslation();
  useTranslatedTitle('nav.gameSetup');
  const isPro = useProStatus();
  const insets = useSafeAreaInsets();
  const [gameName, setGameName] = useState('');
  const [chipMultiplier, setChipMultiplier] = useState('');
  const [customMoney, setCustomMoney] = useState('');
  const [customChips, setCustomChips] = useState('');
  const [players, setPlayers] = useState<PlayerEntry[]>([newEntry(), newEntry()]);
  const [pickerForIndex, setPickerForIndex] = useState<number | null>(null);
  const [contacts, setContacts] = useState(loadContacts());

  const hasMultiplier = chipMultiplier.trim().length > 0;
  const hasCustom = customMoney.trim().length > 0 || customChips.trim().length > 0;

  useFocusEffect(
    useCallback(() => { setContacts(loadContacts()); }, []),
  );

  function getChipMultiplier(): number | undefined {
    if (hasMultiplier) {
      const v = parseFloat(chipMultiplier);
      return !isNaN(v) && v > 0 ? v : undefined;
    }
    if (hasCustom) {
      const money = parseFloat(customMoney);
      const chips = parseFloat(customChips);
      if (!isNaN(money) && !isNaN(chips) && money > 0 && chips > 0) {
        const ratio = chips / money;
        return ratio > 0 ? ratio : undefined;
      }
    }
    return undefined;
  }

  function addPlayer() {
    setPlayers(prev => [...prev, newEntry()]);
  }

  function updatePlayer(index: number, field: keyof Omit<PlayerEntry, 'id'>, value: string) {
    setPlayers(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function removePlayer(index: number) {
    setPlayers(prev => prev.filter((_, i) => i !== index));
  }

  function handleContactPick(index: number) {
    if (!requirePro(isPro, navigation)) return;
    setPickerForIndex(index);
  }

  function handleContactSelected(contact: Contact) {
    if (pickerForIndex !== null) {
      setPlayers(prev => prev.map((p, i) =>
        i === pickerForIndex ? { ...p, name: contact.name, phone: contact.phone } : p,
      ));
    }
    setPickerForIndex(null);
  }

  function startGame() {
    if (players.length < 2) { Alert.alert(t('setup.needPlayers')); return; }
    for (const p of players) {
      if (!p.name.trim()) { Alert.alert(t('setup.needNames')); return; }
      const amount = parseFloat(p.buyIn);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert(t('setup.needBuyIn')); return;
      }
    }
    const names = players.map(p => p.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      Alert.alert(t('setup.duplicateNames'), t('setup.duplicateNamesMsg')); return;
    }

    const gamePlayers: Player[] = players.map(p => {
      const buyInTx: Transaction = { id: uuidv4(), type: 'buyin', amount: parseFloat(p.buyIn), timestamp: Date.now() };
      return { id: uuidv4(), name: p.name.trim(), transactions: [buyInTx], phone: p.phone };
    });

    const game: Game = {
      id: uuidv4(),
      date: Date.now(),
      status: 'active',
      players: gamePlayers,
      name: isPro && gameName.trim() ? gameName.trim() : undefined,
      chipMultiplier: getChipMultiplier(),
    };

    saveGame(game);
    navigation.replace('ActiveGame', { gameId: game.id });
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={players}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <>
            {isPro && (
              <TextInput
                style={styles.gameNameInput}
                placeholder={t('setup.gameName')}
                placeholderTextColor="#999"
                value={gameName}
                onChangeText={setGameName}
              />
            )}
            <TextInput
              style={[styles.gameNameInput, hasCustom && styles.inputDisabled]}
              placeholder={t('setup.chipMultiplier')}
              placeholderTextColor="#999"
              value={chipMultiplier}
              onChangeText={v => { setChipMultiplier(v); setCustomMoney(''); setCustomChips(''); }}
              keyboardType="decimal-pad"
              editable={!hasCustom}
            />
            <Text style={styles.orText}>{t('setup.customOr')}</Text>
            <View style={styles.customRow}>
              <TextInput
                style={[styles.input, styles.customInput, hasMultiplier && styles.inputDisabled]}
                placeholder={t('setup.customMoney')}
                placeholderTextColor="#999"
                value={customMoney}
                onChangeText={v => { setCustomMoney(v); setChipMultiplier(''); }}
                keyboardType="decimal-pad"
                editable={!hasMultiplier}
              />
              <Text style={styles.equalsText}>=</Text>
              <TextInput
                style={[styles.input, styles.customInput, hasMultiplier && styles.inputDisabled]}
                placeholder={t('setup.customChips')}
                placeholderTextColor="#999"
                value={customChips}
                onChangeText={v => { setCustomChips(v); setChipMultiplier(''); }}
                keyboardType="decimal-pad"
                editable={!hasMultiplier}
              />
            </View>
          </>
        }
        renderItem={({ item, index }) => (
          <View style={styles.playerRow}>
            <TextInput
              style={[styles.input, styles.nameInput]}
              placeholder={t('setup.playerName')}
              placeholderTextColor="#999"
              value={item.name}
              onChangeText={v => updatePlayer(index, 'name', v)}
            />
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder={t('setup.buyIn')}
              placeholderTextColor="#999"
              value={item.buyIn}
              keyboardType="decimal-pad"
              onChangeText={v => updatePlayer(index, 'buyIn', v)}
            />
            <TouchableOpacity onPress={() => handleContactPick(index)} style={styles.contactBtn}>
              <Text style={styles.contactBtnText}>{'\u{1F464}'}</Text>
            </TouchableOpacity>
            {players.length > 2 && (
              <TouchableOpacity onPress={() => removePlayer(index)} style={styles.removeBtn}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
        ListFooterComponent={
          <TouchableOpacity style={styles.addBtn} onPress={addPlayer}>
            <Text style={styles.addBtnText}>{t('setup.addPlayer')}</Text>
          </TouchableOpacity>
        }
      />
      <TouchableOpacity style={[styles.startBtn, { bottom: 24 + insets.bottom }]} onPress={startGame}>
        <Text style={styles.startBtnText}>{t('setup.startGame')}</Text>
      </TouchableOpacity>

      <ContactPickerModal
        visible={pickerForIndex !== null}
        contacts={contacts}
        onSelect={handleContactSelected}
        onCancel={() => setPickerForIndex(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16 },
  gameNameInput: {
    backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 15,
    borderWidth: 1, borderColor: '#ddd', marginBottom: 12,
  },
  inputDisabled: { opacity: 0.4 },
  orText: { textAlign: 'center', color: '#999', fontSize: 13, marginBottom: 8 },
  customRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  customInput: { flex: 1 },
  equalsText: { fontSize: 16, color: '#777', fontWeight: '600' },
  playerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd' },
  nameInput: { flex: 1, marginEnd: 8 },
  amountInput: { width: 90, marginEnd: 4 },
  contactBtn: { padding: 8, marginEnd: 4 },
  contactBtnText: { fontSize: 18 },
  removeBtn: { padding: 8 },
  removeText: { color: '#e53935', fontSize: 16 },
  addBtn: {
    alignItems: 'center', padding: 14, borderWidth: 1.5, borderColor: '#1a73e8',
    borderRadius: 10, borderStyle: 'dashed', marginTop: 4,
  },
  addBtnText: { color: '#1a73e8', fontSize: 15, fontWeight: '600' },
  startBtn: {
    position: 'absolute', bottom: 24, left: 20, right: 20,
    backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
