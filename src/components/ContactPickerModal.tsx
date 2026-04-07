// src/components/ContactPickerModal.tsx
import React, { useState, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { Contact } from '../types';

interface Props {
  visible: boolean;
  contacts: Contact[];
  onSelect: (contact: Contact) => void;
  onCancel: () => void;
}

export default function ContactPickerModal({ visible, contacts, onSelect, onCancel }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(c => c.name.toLowerCase().includes(q));
  }, [query, contacts]);

  function handleClose() {
    setQuery('');
    onCancel();
  }

  function handleSelect(contact: Contact) {
    setQuery('');
    onSelect(contact);
  }

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Contact</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Search contacts…"
          value={query}
          onChangeText={setQuery}
          autoFocus
          clearButtonMode="while-editing"
        />
        {contacts.length === 0 ? (
          <Text style={styles.empty}>
            No contacts saved — add them in Settings.
          </Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={c => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
                <Text style={styles.name}>{item.name}</Text>
                {item.phone ? <Text style={styles.phone}>{item.phone}</Text> : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No matches.</Text>}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  closeBtn: { padding: 4 },
  closeBtnText: { color: '#1a73e8', fontSize: 16 },
  search: {
    margin: 12, backgroundColor: '#fff', borderRadius: 10, padding: 12,
    fontSize: 15, borderWidth: 1, borderColor: '#ddd',
  },
  row: {
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8,
    borderRadius: 10, padding: 14, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3,
  },
  name: { fontSize: 16, fontWeight: '600', color: '#111' },
  phone: { fontSize: 13, color: '#777', marginTop: 2 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15, padding: 20 },
});
