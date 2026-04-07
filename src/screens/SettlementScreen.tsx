// src/screens/SettlementScreen.tsx
import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Share,
  Linking, Alert, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Transfer } from '../types';
import { loadGames, updateGame } from '../storage';
import { computeNets, computeTransfers } from '../settlement';
import TransferRow from '../components/TransferRow';
import { useProStatus } from '../hooks/useProStatus';
import { buildSummaryURL, buildTransferURL } from '../utils/whatsapp';
import { useTranslation } from 'react-i18next';
import { useTranslatedTitle } from '../hooks/useTranslatedTitle';

type Props = StackScreenProps<RootStackParamList, 'Settlement'>;

export default function SettlementScreen({ route, navigation }: Props) {
  const { gameId } = route.params;
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [pot, setPot] = useState(0);
  const [phoneByName, setPhoneByName] = useState<Record<string, string>>({});
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [whatsappAvailable, setWhatsappAvailable] = useState<boolean | null>(null);
  const isPro = useProStatus();
  const { t } = useTranslation();
  useTranslatedTitle('nav.settlement');

  useFocusEffect(
    useCallback(() => {
      const game = loadGames().find(g => g.id === gameId);
      if (!game) return;
      if (game.status !== 'finished') updateGame({ ...game, status: 'finished' });
      const totalPot = game.players.flatMap(p => p.transactions)
        .filter(t => t.type === 'buyin' || t.type === 'rebuy')
        .reduce((sum, t) => sum + t.amount, 0);
      const nets = computeNets(game.players);
      const result = computeTransfers(nets);
      // Build phone lookup from player data (set when a contact was picked)
      const phones: Record<string, string> = {};
      for (const p of game.players) {
        if (p.phone) phones[p.name] = p.phone;
      }
      setPot(totalPot);
      setTransfers(result);
      setPhoneByName(phones);
      navigation.setOptions({ headerLeft: () => null });
    }, [gameId, navigation]),
  );

  useEffect(() => {
    if (!isPro) return;
    Linking.canOpenURL('whatsapp://').then(setWhatsappAvailable).catch(() => setWhatsappAvailable(false));
  }, [isPro]);

  async function handleShare() {
    const lines = transfers.length === 0
      ? [t('settlement.noTransfersShareLine')]
      : transfers.map(tr => t('settlement.shareTransferLine', { from: tr.from, arrow: t('common.arrow'), to: tr.to, amount: tr.amount.toFixed(2) }));
    const message = `${t('settlement.shareTitle')}\n\n${lines.join('\n')}\n\n${t('settlement.totalPot', { amount: pot.toFixed(2) })}`;
    await Share.share({ message });
  }

  async function handleShareWhatsApp() {
    const url = buildSummaryURL(transfers, pot);
    await Linking.openURL(url);
  }

  function handleDone() {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

  return (
    <View style={styles.container}>
      {transfers.length === 0 ? (
        <View style={styles.evenContainer}>
          <Text style={styles.evenText}>{t('settlement.noTransfersNeeded')}</Text>
          <Text style={styles.evenSub}>{t('settlement.everyoneBrokeEven')}</Text>
          <Text style={styles.header}>{t('settlement.totalPot', { amount: pot.toFixed(2) })}</Text>
        </View>
      ) : (
        <FlatList
          data={transfers}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <TransferRow transfer={item} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.header}>
              {t('settlement.transferCount', { count: transfers.length, pot: pot.toFixed(2) })}
            </Text>
          }
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>{t('settlement.shareResults')}</Text>
        </TouchableOpacity>

        {isPro && whatsappAvailable === true && (
          <>
            <TouchableOpacity style={styles.whatsappBtn} onPress={handleShareWhatsApp}>
              <Text style={styles.whatsappBtnText}>{t('settlement.shareWhatsApp')}</Text>
            </TouchableOpacity>
            {transfers.length > 0 && (
              <TouchableOpacity style={styles.whatsappBtn} onPress={() => setMessageModalVisible(true)}>
                <Text style={styles.whatsappBtnText}>{t('settlement.messagePlayers')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        {isPro && whatsappAvailable === false && (
          <Text style={styles.noWhatsapp}>{t('settlement.whatsappNotInstalled')}</Text>
        )}

        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>{t('common.done')}</Text>
        </TouchableOpacity>
      </View>

      <MessagePlayersModal
        visible={messageModalVisible}
        transfers={transfers}
        phoneByName={phoneByName}
        onClose={() => setMessageModalVisible(false)}
      />
    </View>
  );
}

// ── Message Players Modal ────────────────────────────────────────────────────

interface ModalProps {
  visible: boolean;
  transfers: Transfer[];
  phoneByName: Record<string, string>; // player name → E.164 phone (from Player.phone)
  onClose: () => void;
}

function MessagePlayersModal({ visible, transfers, phoneByName, onClose }: ModalProps) {
  const { t } = useTranslation();

  async function sendMessage(phone: string, from: string, to: string, amount: number) {
    const url = buildTransferURL(phone, from, to, amount);
    await Linking.openURL(url);
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={mStyles.container}>
        <View style={mStyles.header}>
          <Text style={mStyles.title}>{t('settlement.messagePlayers')}</Text>
          <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}>
            <Text style={mStyles.closeBtnText}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={mStyles.list}>
          {transfers.map((tr, i) => {
            const phone = phoneByName[tr.from];
            return (
              <View key={i} style={mStyles.row}>
                <Text style={mStyles.transferText}>
                  {t('settlement.owes', { from: tr.from, to: tr.to, amount: tr.amount.toFixed(2) })}
                </Text>
                {phone ? (
                  <TouchableOpacity
                    style={mStyles.sendBtn}
                    onPress={() => sendMessage(phone, tr.from, tr.to, tr.amount)}
                  >
                    <Text style={mStyles.sendBtnText}>{t('settlement.sendWhatsApp')}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={mStyles.hint}>
                    {t('settlement.contactHint', { name: tr.from })}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee',
    paddingTop: 50,
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: { padding: 4 },
  closeBtnText: { color: '#1a73e8', fontSize: 16 },
  list: { padding: 16 },
  row: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 12,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3,
  },
  transferText: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 10 },
  sendBtn: { backgroundColor: '#25D366', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 4 },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hint: { fontSize: 13, color: '#999', fontStyle: 'italic' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, paddingBottom: 260 },
  header: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 16, writingDirection: 'ltr' },
  evenContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  evenText: { fontSize: 22, fontWeight: '700', color: '#2e7d32' },
  evenSub: { fontSize: 15, color: '#777', marginTop: 8 },
  footer: { position: 'absolute', bottom: 24, left: 20, right: 20, gap: 10 },
  shareBtn: { backgroundColor: '#2e7d32', borderRadius: 12, padding: 16, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  whatsappBtn: { backgroundColor: '#25D366', borderRadius: 12, padding: 14, alignItems: 'center' },
  whatsappBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  noWhatsapp: { textAlign: 'center', color: '#999', fontSize: 13 },
  doneBtn: { backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
