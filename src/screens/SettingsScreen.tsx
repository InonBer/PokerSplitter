// src/screens/SettingsScreen.tsx
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, I18nManager,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../types';
import {
  loadGames, loadContacts, restoreBackup, clearAllGames,
} from '../storage';
import { serializeBackup, validateBackup } from '../utils/backup';
import { generateAllGamesCSV } from '../utils/csvExport';
import { useProStatus } from '../hooks/useProStatus';
import { requirePro } from '../utils/proGate';
import { useTranslatedTitle } from '../hooks/useTranslatedTitle';
import { changeAppLanguage, getCurrentLanguage, AppLanguage } from '../i18n/changeLanguage';
import Constants from 'expo-constants';

type Props = StackScreenProps<RootStackParamList, 'Settings'>;

const LANGUAGE_NAMES: Record<AppLanguage, string> = { en: 'English', he: 'עברית' };

export default function SettingsScreen({ navigation }: Props) {
  const isPro = useProStatus();
  const { t } = useTranslation();
  useTranslatedTitle('nav.settings');

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
      Alert.alert(t('settings.error'), t('settings.couldNotRead'));
      return;
    }

    let backup;
    try {
      backup = validateBackup(raw);
    } catch (e: any) {
      Alert.alert(t('settings.invalidBackup'), e.message ?? t('settings.couldNotRead'));
      return;
    }

    const games = loadGames();
    const hasActive = games.some(g => g.status === 'active');
    const msg = hasActive
      ? t('settings.restoreActiveGame')
      : t('settings.restoreConfirm');

    Alert.alert(t('settings.restoreBackupTitle'), msg, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.restore'), style: 'destructive',
        onPress: () => {
          restoreBackup(backup.games, backup.contacts);
          Alert.alert(t('settings.restoreSuccess'), t('settings.restoreSuccessMsg'));
          navigation.navigate('Home');
        },
      },
    ]);
  }

  function handleDeleteHistory() {
    if (!requirePro(isPro, navigation)) return;
    Alert.alert(t('settings.deleteHistory'), t('settings.deleteHistoryConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: () => {
          clearAllGames();
          Alert.alert(t('settings.deleteHistorySuccess'));
        },
      },
    ]);
  }

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const chevron = I18nManager.isRTL ? '‹' : '›';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isPro ? (
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>{t('settings.pro')}</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('Paywall')}>
          <Text style={styles.upgradeBtnText}>{t('settings.unlock')}</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>{t('settings.general')}</Text>
      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          const options = (['en', 'he'] as AppLanguage[]).map(lang => ({
            text: LANGUAGE_NAMES[lang],
            onPress: () => changeAppLanguage(lang),
          }));
          Alert.alert(t('settings.language'), undefined, [
            ...options,
            { text: t('common.cancel'), style: 'cancel' },
          ]);
        }}
      >
        <Text style={styles.rowText}>{t('settings.language')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#777', marginEnd: 8 }}>{LANGUAGE_NAMES[getCurrentLanguage()]}</Text>
          <Text style={styles.chevron}>{chevron}</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t('settings.data')}</Text>
      <TouchableOpacity style={styles.row} onPress={() => { if (!requirePro(isPro, navigation)) return; navigation.navigate('Contacts'); }}>
        <Text style={styles.rowText}>{t('settings.manageContacts')} {!isPro && '(Pro)'}</Text>
        <Text style={styles.chevron}>{chevron}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={handleExportAll}>
        <Text style={styles.rowText}>{t('settings.exportAll')} {!isPro && '(Pro)'}</Text>
        <Text style={styles.chevron}>{chevron}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={handleBackup}>
        <Text style={styles.rowText}>{t('settings.backup')} {!isPro && '(Pro)'}</Text>
        <Text style={styles.chevron}>{chevron}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={handleRestore}>
        <Text style={styles.rowText}>{t('settings.restore')} {!isPro && '(Pro)'}</Text>
        <Text style={styles.chevron}>{chevron}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={handleDeleteHistory}>
        <Text style={[styles.rowText, styles.destructiveText]}>{t('settings.deleteHistory')} {!isPro && '(Pro)'}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>{t('settings.version', { version })}</Text>
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
  destructiveText: { color: '#e53935' },
  chevron: { fontSize: 20, color: '#ccc' },
  version: { textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 32 },
});
