// src/screens/SettingsScreen.tsx
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import {
  loadGames, loadContacts, restoreBackup,
} from '../storage';
import { serializeBackup, validateBackup } from '../utils/backup';
import { generateAllGamesCSV } from '../utils/csvExport';
import { useProStatus } from '../hooks/useProStatus';
import { requirePro } from '../utils/proGate';
import Constants from 'expo-constants';

type Props = StackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const isPro = useProStatus();

  async function handleExportAll() {
    if (!requirePro(isPro, navigation)) return;
    const csv = generateAllGamesCSV(loadGames());
    const path = `${FileSystem.cacheDirectory}pokersplitter-games.csv`;
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path);
  }

  async function handleBackup() {
    if (!requirePro(isPro, navigation)) return;
    const json = serializeBackup(loadGames(), loadContacts());
    const date = new Date().toISOString().slice(0, 10);
    const path = `${FileSystem.cacheDirectory}pokersplitter-backup-${date}.json`;
    await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path);
  }

  async function handleRestore() {
    if (!requirePro(isPro, navigation)) return;

    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (result.canceled) return;

    const asset = result.assets[0];
    let raw: string;
    try {
      raw = await FileSystem.readAsStringAsync(asset.uri);
    } catch {
      Alert.alert('Error', 'Could not read the file.');
      return;
    }

    let backup;
    try {
      backup = validateBackup(raw);
    } catch (e: any) {
      Alert.alert('Invalid backup', e.message ?? 'File could not be validated.');
      return;
    }

    const games = loadGames();
    const hasActive = games.some(g => g.status === 'active');
    const msg = hasActive
      ? 'You have a game in progress. Restoring will discard it. Continue?'
      : 'This will replace all current data. Continue?';

    Alert.alert('Restore backup', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore', style: 'destructive',
        onPress: () => {
          restoreBackup(backup.games, backup.contacts);
          Alert.alert('Restored', 'Data has been restored successfully.');
          navigation.navigate('Home');
        },
      },
    ]);
  }

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isPro ? (
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>⭐ Pro</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('Paywall')}>
          <Text style={styles.upgradeBtnText}>Unlock Pro — $2.99</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Data</Text>
      <TouchableOpacity style={styles.row} onPress={() => { if (!requirePro(isPro, navigation)) return; navigation.navigate('Contacts'); }}>
        <Text style={styles.rowText}>Manage Contacts {!isPro && '🔒'}</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={handleExportAll}>
        <Text style={styles.rowText}>Export All Games (CSV) {!isPro && '🔒'}</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={handleBackup}>
        <Text style={styles.rowText}>Backup Data {!isPro && '🔒'}</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={handleRestore}>
        <Text style={styles.rowText}>Restore Data {!isPro && '🔒'}</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <Text style={styles.version}>PokerSplitter v{version}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  proBadge: {
    backgroundColor: '#fff3e0', borderRadius: 10, padding: 14,
    alignItems: 'center', marginBottom: 20,
  },
  proBadgeText: { fontSize: 16, fontWeight: '700', color: '#e65100' },
  upgradeBtn: {
    backgroundColor: '#1a73e8', borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 20,
  },
  upgradeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 12, color: '#999', marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3,
  },
  rowText: { fontSize: 15, color: '#111' },
  chevron: { fontSize: 20, color: '#ccc' },
  version: { textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 32 },
});
