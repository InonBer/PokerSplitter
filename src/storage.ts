// src/storage.ts
import { createMMKV } from 'react-native-mmkv';
import { Game } from './types';

const storage = createMMKV();
const GAMES_KEY = 'games';

export function loadGames(): Game[] {
  const raw = storage.getString(GAMES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Game[];
  } catch {
    return [];
  }
}

function persistGames(games: Game[]): void {
  storage.set(GAMES_KEY, JSON.stringify(games));
}

export function saveGame(game: Game): void {
  const games = loadGames();
  const exists = games.some(g => g.id === game.id);
  if (exists) return;
  persistGames([...games, game]);
}

export function updateGame(updated: Game): void {
  const games = loadGames().map(g => (g.id === updated.id ? updated : g));
  persistGames(games);
}

export function deleteGame(id: string): void {
  persistGames(loadGames().filter(g => g.id !== id));
}
