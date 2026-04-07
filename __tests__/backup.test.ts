// __tests__/backup.test.ts
import { validateBackup, serializeBackup } from '../src/utils/backup';

const validGames = [
  { id: 'g1', status: 'finished', players: [], date: 1000 },
];

describe('validateBackup', () => {
  it('throws on invalid JSON', () => {
    expect(() => validateBackup('not json')).toThrow('Invalid JSON');
  });

  it('throws when games array is missing', () => {
    expect(() => validateBackup('{}')).toThrow('"games" array');
  });

  it('throws when a game object is malformed — missing id', () => {
    const bad = JSON.stringify({ games: [{ status: 'finished', players: [], date: 1 }] });
    expect(() => validateBackup(bad)).toThrow('"id"');
  });

  it('throws when a game has invalid status', () => {
    const bad = JSON.stringify({ games: [{ id: 'g1', status: 'unknown', players: [], date: 1 }] });
    expect(() => validateBackup(bad)).toThrow('"status"');
  });

  it('throws when a game is missing players', () => {
    const bad = JSON.stringify({ games: [{ id: 'g1', status: 'finished', date: 1 }] });
    expect(() => validateBackup(bad)).toThrow('"players"');
  });

  it('throws when a game is missing date', () => {
    const bad = JSON.stringify({ games: [{ id: 'g1', status: 'finished', players: [] }] });
    expect(() => validateBackup(bad)).toThrow('"date"');
  });

  it('returns games and empty contacts when contacts absent', () => {
    const result = validateBackup(JSON.stringify({ games: validGames }));
    expect(result.games).toHaveLength(1);
    expect(result.contacts).toEqual([]);
  });

  it('returns contacts when present', () => {
    const contacts = [{ id: 'c1', name: 'Dan' }];
    const result = validateBackup(JSON.stringify({ games: validGames, contacts }));
    expect(result.contacts).toEqual(contacts);
  });

  it('ignores unknown top-level keys including isPro', () => {
    const data = JSON.stringify({ games: validGames, isPro: true, extra: 'ignored' });
    expect(() => validateBackup(data)).not.toThrow();
  });
});

describe('serializeBackup', () => {
  it('produces valid JSON with games and contacts', () => {
    const json = serializeBackup(validGames as any, []);
    const parsed = JSON.parse(json);
    expect(parsed.games).toHaveLength(1);
    expect(parsed.contacts).toEqual([]);
  });

  it('does not include isPro', () => {
    const json = serializeBackup(validGames as any, []);
    expect(json).not.toContain('isPro');
  });
});
