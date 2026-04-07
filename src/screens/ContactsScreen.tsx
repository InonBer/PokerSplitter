// src/screens/ContactsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { v4 as uuidv4 } from 'uuid';
import { RootStackParamList, Contact } from '../types';
import { loadContacts, saveContact, updateContact, deleteContact } from '../storage';

type Props = StackScreenProps<RootStackParamList, 'Contacts'>;

const PHONE_REGEX = /^\+\d{7,15}$/;

function validatePhone(phone: string): string | null {
  if (!phone) return null; // optional
  if (!PHONE_REGEX.test(phone)) return 'Enter a valid phone number (e.g. +972501234567)';
  return null;
}

export default function ContactsScreen(_: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setContacts(loadContacts());
    }, []),
  );

  function openAdd() {
    setEditing(null);
    setName('');
    setPhone('');
    setPhoneError(null);
    setModalVisible(true);
  }

  function openEdit(c: Contact) {
    setEditing(c);
    setName(c.name);
    setPhone(c.phone ?? '');
    setPhoneError(null);
    setModalVisible(true);
  }

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required');
      return;
    }
    const err = validatePhone(phone.trim());
    if (err) {
      setPhoneError(err);
      return;
    }
    const contact: Contact = {
      id: editing?.id ?? uuidv4(),
      name: name.trim(),
      phone: phone.trim() || undefined,
    };
    if (editing) {
      updateContact(contact);
    } else {
      saveContact(contact);
    }
    setContacts(loadContacts());
    setModalVisible(false);
  }

  function handleDelete(id: string) {
    Alert.alert('Delete contact', 'Remove this contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          deleteContact(id);
          setContacts(loadContacts());
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        keyExtractor={c => c.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => openEdit(item)}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              {item.phone ? <Text style={styles.phone}>{item.phone}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No contacts saved yet.</Text>
        }
      />
      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Add Contact</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Contact' : 'New Contact'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Name *"
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <TextInput
              style={[styles.input, phoneError ? styles.inputError : null]}
              placeholder="Phone (e.g. +972501234567)"
              value={phone}
              onChangeText={v => { setPhone(v); setPhoneError(null); }}
              keyboardType="phone-pad"
            />
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, paddingBottom: 90 },
  row: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  name: { fontSize: 16, fontWeight: '600', color: '#111' },
  phone: { fontSize: 13, color: '#777', marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteText: { color: '#e53935', fontSize: 16 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  addBtn: {
    position: 'absolute', bottom: 24, left: 20, right: 20,
    backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#111' },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12,
    fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#ddd',
  },
  inputError: { borderColor: '#e53935' },
  errorText: { color: '#e53935', fontSize: 13, marginBottom: 8, marginTop: -8 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  cancelBtnText: { color: '#666', fontSize: 15 },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#1a73e8', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
