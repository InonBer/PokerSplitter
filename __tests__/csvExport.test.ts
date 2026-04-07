// __tests__/csvExport.test.ts
import { generateSingleGameCSV, generateAllGamesCSV } from '../src/utils/csvExport';
import { Game } from '../src/types';

const baseGame: Game = {
  id: 'g1',
  date: new Date('2026-04-07').getTime(),
  status: 'finished',
  name: 'Friday Night',
  players: [
    {
      id: 'p1', name: 'Dan', finalChips: 145,
      transactions: [{ id: 't1', type: 'buyin', amount: 100, timestamp: 0 }],
    },
    {
      id: 'p2', name: 'Maya', finalChips: 55,
      transactions: [{ id: 't2', type: 'buyin', amount: 100, timestamp: 0 }],
    },
  ],
};

describe('generateSingleGameCSV', () => {
  it('includes header row', () => {
    const csv = generateSingleGameCSV(baseGame);
    expect(csv).toContain('Game,Date,Player,Total In,Cash Out / Final Chips,Net');
  });

  it('uses game name in Game column', () => {
    const csv = generateSingleGameCSV(baseGame);
    expect(csv).toContain('Friday Night,2026-04-07,Dan');
  });

  it('falls back to "Unnamed Game" when name is undefined', () => {
    const game = { ...baseGame, name: undefined };
    const csv = generateSingleGameCSV(game);
    expect(csv).toContain('Unnamed Game,');
  });

  it('formats positive net with + prefix', () => {
    const csv = generateSingleGameCSV(baseGame);
    expect(csv).toContain('+45.00');
  });

  it('formats negative net with - prefix', () => {
    const csv = generateSingleGameCSV(baseGame);
    expect(csv).toContain('-45.00');
  });

  it('includes Transfers section', () => {
    const csv = generateSingleGameCSV(baseGame);
    expect(csv).toContain('Transfers');
    expect(csv).toContain('From,To,Amount');
    expect(csv).toContain('Maya,Dan,45.00');
  });
});

describe('generateAllGamesCSV', () => {
  it('skips active games', () => {
    const activeGame: Game = { ...baseGame, id: 'g2', status: 'active', name: 'Active' };
    const csv = generateAllGamesCSV([activeGame]);
    expect(csv).not.toContain('Active');
  });

  it('includes multiple games separated by blank line', () => {
    const game2: Game = {
      ...baseGame,
      id: 'g2',
      name: 'Saturday',
      date: new Date('2026-04-05').getTime(),
    };
    const csv = generateAllGamesCSV([baseGame, game2]);
    expect(csv).toContain('Friday Night');
    expect(csv).toContain('Saturday');
    expect(csv).toContain('\n\n');
  });

  it('does not include Transfers section', () => {
    const csv = generateAllGamesCSV([baseGame]);
    expect(csv).not.toContain('Transfers');
  });
});
