// __tests__/storage.test.ts
import { loadGames, saveGame, updateGame, deleteGame } from '../src/storage';
import { Game } from '../src/types';

// Declare mockStore outside the mock so beforeEach can reset it.
// The arrow functions in the mock capture the `mockStore` binding (not its value),
// so reassigning `mockStore = {}` gives every test a clean slate.
// Jest allows variables prefixed with "mock" (case insensitive) to be referenced
// inside jest.mock() factory functions.
let mockStore: Record<string, string> = {};

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn().mockReturnValue({
    getString: (key: string) => mockStore[key],
    set: (key: string, value: string) => { mockStore[key] = value; },
  }),
}));

const makeGame = (id: string): Game => ({
  id,
  date: Date.now(),
  status: 'active',
  players: [],
});

beforeEach(() => {
  mockStore = {}; // fresh store before every test — prevents cross-test state bleed
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
