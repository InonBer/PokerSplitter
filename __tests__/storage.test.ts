// __tests__/storage.test.ts
import { loadGames, saveGame, updateGame, deleteGame } from '../src/storage';
import { loadContacts, saveContact, updateContact, deleteContact, loadIsPro, setIsPro } from '../src/storage';
import { Game } from '../src/types';
import { Contact } from '../src/types';

jest.mock('react-native-mmkv', () => {
  let mockStore: Record<string, string | boolean | undefined> = {};
  return {
    createMMKV: () => ({
      getString: (key: string) =>
        typeof mockStore[key] === 'string' ? (mockStore[key] as string) : undefined,
      getBoolean: (key: string) =>
        typeof mockStore[key] === 'boolean' ? (mockStore[key] as boolean) : undefined,
      set: (key: string, value: string | boolean) => { mockStore[key] = value; },
    }),
    __setMockStore: (s: Record<string, string | boolean | undefined>) => { mockStore = s; },
    __getMockStore: () => mockStore,
  };
});

const makeGame = (id: string): Game => ({
  id,
  date: Date.now(),
  status: 'active',
  players: [],
});

beforeEach(() => {
  const mmkv = require('react-native-mmkv');
  mmkv.__setMockStore({});
});

describe('loadGames', () => {
  it('returns empty array when storage is empty', () => {
    expect(loadGames()).toEqual([]);
  });
});

describe('saveGame', () => {
  it('adds a game to storage', () => {
    const game = makeGame('g1');
    saveGame(game);
    expect(loadGames()).toContainEqual(game);
  });

  it('does not duplicate a game saved twice', () => {
    const game = makeGame('g2');
    saveGame(game);
    saveGame(game);
    expect(loadGames().filter(g => g.id === 'g2')).toHaveLength(1);
  });
});

describe('updateGame', () => {
  it('updates a game by id', () => {
    const game = makeGame('g3');
    saveGame(game);
    const updated = { ...game, status: 'finished' as const };
    updateGame(updated);
    expect(loadGames().find(g => g.id === 'g3')?.status).toBe('finished');
  });
});

describe('deleteGame', () => {
  it('removes a game by id', () => {
    const game = makeGame('g4');
    saveGame(game);
    deleteGame('g4');
    expect(loadGames().find(g => g.id === 'g4')).toBeUndefined();
  });
});

// --- Contacts ---

describe('loadContacts', () => {
  it('returns empty array when nothing stored', () => {
    expect(loadContacts()).toEqual([]);
  });
});

describe('saveContact', () => {
  it('stores a contact and loadContacts returns it', () => {
    const c: Contact = { id: 'c1', name: 'Dan' };
    saveContact(c);
    expect(loadContacts()).toEqual([c]);
  });

  it('ignores duplicate id', () => {
    const c: Contact = { id: 'c1', name: 'Dan' };
    saveContact(c);
    saveContact(c);
    expect(loadContacts()).toHaveLength(1);
  });
});

describe('updateContact', () => {
  it('replaces the contact with matching id', () => {
    saveContact({ id: 'c1', name: 'Dan' });
    updateContact({ id: 'c1', name: 'Danny', phone: '+1234567890' });
    expect(loadContacts()[0].name).toBe('Danny');
  });
});

describe('deleteContact', () => {
  it('removes contact by id', () => {
    saveContact({ id: 'c1', name: 'Dan' });
    deleteContact('c1');
    expect(loadContacts()).toEqual([]);
  });
});

// --- isPro ---

describe('loadIsPro / setIsPro', () => {
  it('defaults to false', () => {
    expect(loadIsPro()).toBe(false);
  });

  it('persists true', () => {
    setIsPro(true);
    expect(loadIsPro()).toBe(true);
  });

  it('persists false', () => {
    setIsPro(true);
    setIsPro(false);
    expect(loadIsPro()).toBe(false);
  });
});
