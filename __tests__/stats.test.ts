// __tests__/stats.test.ts
import { computeStats } from '../src/utils/stats';
import { Game } from '../src/types';

const mkGame = (overrides: Partial<Game> = {}): Game => ({
  id: 'g1', date: 1000, status: 'finished', players: [], ...overrides,
});

const mkPlayer = (name: string, totalIn: number, finalChips: number) => ({
  id: name,
  name,
  finalChips,
  transactions: [{ id: 't1', type: 'buyin' as const, amount: totalIn, timestamp: 0 }],
});

describe('computeStats', () => {
  it('returns empty array for no finished games', () => {
    expect(computeStats([])).toEqual([]);
  });

  it('ignores active games', () => {
    const game = mkGame({ status: 'active', players: [mkPlayer('Dan', 100, 150)] });
    expect(computeStats([game])).toEqual([]);
  });

  it('computes net for a single finished game', () => {
    const game = mkGame({ players: [mkPlayer('Dan', 100, 145), mkPlayer('Maya', 100, 55)] });
    const stats = computeStats([game]);
    expect(stats).toHaveLength(2);
    const dan = stats.find(s => s.name === 'Dan')!;
    expect(dan.totalNet).toBe(45);
    expect(dan.gamesPlayed).toBe(1);
    expect(dan.biggestWin).toBe(45);
  });

  it('aggregates the same player across multiple games (case-insensitive)', () => {
    const g1 = mkGame({ id: 'g1', players: [mkPlayer('Dan', 100, 150)] });
    const g2 = mkGame({ id: 'g2', players: [mkPlayer('dan', 100, 80)] });
    const stats = computeStats([g1, g2]);
    expect(stats).toHaveLength(1);
    expect(stats[0].gamesPlayed).toBe(2);
    expect(stats[0].totalNet).toBe(30); // +50 -20
    expect(stats[0].name).toBe('Dan');
  });

  it('biggestWin is 0 for a player who never won', () => {
    const game = mkGame({ players: [mkPlayer('Loser', 100, 50)] });
    const stats = computeStats([game]);
    expect(stats[0].biggestWin).toBe(0);
  });

  it('biggestWin is max single-game win across multiple games', () => {
    const g1 = mkGame({ id: 'g1', players: [mkPlayer('Dan', 100, 150)] }); // +50
    const g2 = mkGame({ id: 'g2', players: [mkPlayer('Dan', 100, 130)] }); // +30
    const stats = computeStats([g1, g2]);
    expect(stats[0].biggestWin).toBe(50);
  });

  it('sorts by totalNet descending', () => {
    const game = mkGame({
      players: [mkPlayer('Low', 100, 80), mkPlayer('High', 100, 160)],
    });
    const stats = computeStats([game]);
    expect(stats[0].name).toBe('High');
    expect(stats[1].name).toBe('Low');
  });

  it('handles cashed-out players (no finalChips)', () => {
    const player = {
      id: 'p1', name: 'Early', finalChips: undefined,
      transactions: [
        { id: 't1', type: 'buyin' as const, amount: 100, timestamp: 0 },
        { id: 't2', type: 'cashout' as const, amount: 120, timestamp: 1 },
      ],
    };
    const game = mkGame({ players: [player] });
    const stats = computeStats([game]);
    expect(stats[0].totalNet).toBe(20);
  });
});
