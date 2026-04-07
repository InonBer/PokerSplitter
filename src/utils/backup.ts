// src/utils/backup.ts
import { Game, Contact } from '../types';

export interface BackupData {
  games: Game[];
  contacts: Contact[];
}

export function serializeBackup(games: Game[], contacts: Contact[]): string {
  return JSON.stringify({ games, contacts }, null, 2);
}

export function validateBackup(raw: string): BackupData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Expected a JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.games)) {
    throw new Error('Missing required "games" array');
  }

  for (const item of obj.games as unknown[]) {
    if (typeof item !== 'object' || item === null) {
      throw new Error('Each game must be an object');
    }
    const g = item as Record<string, unknown>;
    if (typeof g.id !== 'string') throw new Error('Game missing "id"');
    if (g.status !== 'active' && g.status !== 'finished') {
      throw new Error('Game has invalid "status"');
    }
    if (!Array.isArray(g.players)) throw new Error('Game missing "players"');
    if (typeof g.date !== 'number') throw new Error('Game missing "date"');
  }

  const contacts = Array.isArray(obj.contacts) ? (obj.contacts as Contact[]) : [];

  return { games: obj.games as Game[], contacts };
}
