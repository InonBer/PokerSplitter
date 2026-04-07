// src/screens/PaywallScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
  ScrollView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { RootStackParamList } from '../types';
import { setIsPro } from '../storage';

type Props = StackScreenProps<RootStackParamList, 'Paywall'>;

const FEATURES = [
  'Unlimited games',
  'Save player contacts',
  'WhatsApp integration',
  'All-time player stats',
  'CSV export',
  'Backup & restore',
];

export default function PaywallScreen({ navigation }: Props) {
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [loadingOffering, setLoadingOffering] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Purchases.getOfferings()
      .then(o => setPkg(
        o.all['default']?.availablePackages[0] ?? o.current?.availablePackages[0] ?? null,
      ))
      .catch(() => {})
      .finally(() => setLoadingOffering(false));
  }, []);

  async function handlePurchase() {
    if (!pkg) return;
    setBusy(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const active = typeof customerInfo.entitlements.active['pro'] !== 'undefined';
      if (active) {
        setIsPro(true);
        navigation.goBack();
      }
    } catch (e: any) {
      if (!e.userCancelled) Alert.alert('Purchase failed', e.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    setBusy(true);
    try {
      const info = await Purchases.restorePurchases();
      const active = typeof info.entitlements.active['pro'] !== 'undefined';
      setIsPro(active);
      if (active) {
        Alert.alert('Restored!', 'Pro features are now unlocked.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Nothing to restore', 'No previous Pro purchase found for this account.');
      }
    } catch (e: any) {
      Alert.alert('Restore failed', e.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Unlock PokerSplitter Pro</Text>
        <Text style={styles.subtitle}>One-time purchase · No subscription</Text>
        {FEATURES.map(f => (
          <View key={f} style={styles.featureRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
        {loadingOffering ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#1a73e8" />
        ) : (
          <>
            <TouchableOpacity
              style={[styles.buyBtn, busy && styles.disabled]}
              onPress={handlePurchase}
              disabled={busy}
            >
              <Text style={styles.buyBtnText}>
                {busy ? 'Processing…' : 'Unlock Pro — $2.99'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRestore} disabled={busy}>
              <Text style={styles.restoreText}>Restore Purchase</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 8 },
  closeBtnText: { fontSize: 20, color: '#666' },
  content: { padding: 28, paddingTop: 56, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#111', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#999', marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignSelf: 'stretch', marginBottom: 14 },
  check: { color: '#1a73e8', fontSize: 16, fontWeight: '700', marginRight: 10 },
  featureText: { fontSize: 16, color: '#333', flex: 1 },
  buyBtn: {
    marginTop: 36, backgroundColor: '#1a73e8', borderRadius: 12,
    padding: 16, alignItems: 'center', alignSelf: 'stretch',
  },
  disabled: { opacity: 0.5 },
  buyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  restoreText: { marginTop: 16, color: '#888', fontSize: 14 },
});
