// src/components/AmountModal.tsx
import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  title: string;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
  chipMultiplier?: number;
}

export default function AmountModal({ visible, title, onConfirm, onCancel, chipMultiplier }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  function handleConfirm() {
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > 0) {
      onConfirm(amount);
      setValue('');
    }
  }

  function handleCancel() {
    setValue('');
    onCancel();
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('amount.placeholder')}
            keyboardType="decimal-pad"
            value={value}
            onChangeText={setValue}
            autoFocus
          />
          {chipMultiplier && parseFloat(value) > 0 ? (
            <Text style={styles.chipsPreview}>
              {t('amount.chipsPreview', { chips: Math.round(parseFloat(value) * chipMultiplier) })}
            </Text>
          ) : null}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>{t('common.confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    width: '80%',
  },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 16, color: '#111' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  chipsPreview: { fontSize: 14, color: '#1a73e8', fontWeight: '600', marginBottom: 12, marginTop: -8 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { padding: 10 },
  cancelText: { color: '#777', fontSize: 15 },
  confirmBtn: {
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
