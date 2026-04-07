// src/storage.ts
import { createMMKV } from 'react-native-mmkv';
import { Game, Contact } from './types';

const storage = createMMKV();

const GAMES_KEY = 'games';
const CONTACTS_KEY = 'contacts';
const IS_PRO_KEY = 'isPro';

// ── Games ────────────────────────────────────────────────────────────────────

export function loadGames(): Game[] {
  const raw = storage.getString(GAMES_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as Game[]; } catch { return []; }
}

function persistGames(games: Game[]): void {
  storage.set(GAMES_KEY, JSON.stringify(games));
}

export function saveGame(game: Game): void {
  const games = loadGames();
  if (games.some(g => g.id === game.id)) return;
  persistGames([...games, game]);
}

export function updateGame(updated: Game): void {
  persistGames(loadGames().map(g => (g.id === updated.id ? updated : g)));
}

export function deleteGame(id: string): void {
  persistGames(loadGames().filter(g => g.id !== id));
}

// ── Contacts ─────────────────────────────────────────────────────────────────

export function loadContacts(): Contact[] {
  const raw = storage.getString(CONTACTS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as Contact[]; } catch { return []; }
}

function persistContacts(contacts: Contact[]): void {
  storage.set(CONTACTS_KEY, JSON.stringify(contacts));
}

export function saveContact(contact: Contact): void {
  const contacts = loadContacts();
  if (contacts.some(c => c.id === contact.id)) return;
  persistContacts([...contacts, contact]);
}

export function updateContact(updated: Contact): void {
  persistContacts(loadContacts().map(c => (c.id === updated.id ? updated : c)));
}

export function deleteContact(id: string): void {
  persistContacts(loadContacts().filter(c => c.id !== id));
}

// ── Pro status ───────────────────────────────────────────────────────────────

export function loadIsPro(): boolean {
  return storage.getBoolean(IS_PRO_KEY) ?? false;
}

export function setIsPro(value: boolean): void {
  storage.set(IS_PRO_KEY, value);
}
