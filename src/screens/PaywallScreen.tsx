// src/screens/PaywallScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
  ScrollView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { RootStackParamList } from '../types';
import { useTranslation } from 'react-i18next';
import { setIsPro } from '../storage';

type Props = StackScreenProps<RootStackParamList, 'Paywall'>;

export default function PaywallScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const features = [
    t('paywall.feature.unlimitedGames'),
    t('paywall.feature.contacts'),
    t('paywall.feature.whatsapp'),
    t('paywall.feature.stats'),
    t('paywall.feature.csv'),
    t('paywall.feature.backup'),
  ];
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
      if (!e.userCancelled) Alert.alert(t('paywall.purchaseFailed'), e.message ?? t('paywall.tryAgain'));
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
        Alert.alert(t('paywall.restored'), t('paywall.restoredMsg'), [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert(t('paywall.nothingToRestore'), t('paywall.nothingToRestoreMsg'));
      }
    } catch (e: any) {
      Alert.alert(t('paywall.restoreFailed'), e.message ?? t('paywall.tryAgain'));
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
        <Text style={styles.title}>{t('paywall.title')}</Text>
        <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>
        {features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
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
                {busy ? t('paywall.processing') : t('paywall.unlock')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRestore} disabled={busy}>
              <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
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
  check: { color: '#1a73e8', fontSize: 16, fontWeight: '700', marginEnd: 10 },
  featureText: { fontSize: 16, color: '#333', flex: 1 },
  buyBtn: {
    marginTop: 36, backgroundColor: '#1a73e8', borderRadius: 12,
    padding: 16, alignItems: 'center', alignSelf: 'stretch',
  },
  disabled: { opacity: 0.5 },
  buyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  restoreText: { marginTop: 16, color: '#888', fontSize: 14 },
});
