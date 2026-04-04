// __tests__/settlement.test.ts
import { computeNets, computeTransfers } from '../src/settlement';
import { Player, Transfer } from '../src/types';

function makePlayer(
  name: string,
  buyins: number[],
  rebuys: number[],
  cashouts: number[],
  finalChips?: number,
): Player {
  const transactions = [
    ...buyins.map((amount, i) => ({ id: `b${i}`, type: 'buyin' as const, amount, timestamp: 0 })),
    ...rebuys.map((amount, i) => ({ id: `r${i}`, type: 'rebuy' as const, amount, timestamp: 0 })),
    ...cashouts.map((amount, i) => ({ id: `c${i}`, type: 'cashout' as const, amount, timestamp: 0 })),
  ];
  return { id: name, name, transactions, finalChips };
}

describe('computeNets', () => {
  it('calculates net for a winner (bought in $50, ended with $80)', () => {
    const player = makePlayer('Alice', [50], [], [], 80);
    const nets = computeNets([player]);
    expect(nets['Alice']).toBeCloseTo(30);
  });

  it('calculates net for a loser (bought in $50, ended with $20)', () => {
    const player = makePlayer('Bob', [50], [], [], 20);
    const nets = computeNets([player]);
    expect(nets['Bob']).toBeCloseTo(-30);
  });

  it('accounts for rebuys in totalIn', () => {
    const player = makePlayer('Carol', [50], [50], [], 60);
    const nets = computeNets([player]);
    // totalIn = 100, finalChips = 60, net = -40
    expect(nets['Carol']).toBeCloseTo(-40);
  });

  it('uses cashedOutAmount for early cash-out players (no finalChips)', () => {
    const player = makePlayer('Dave', [50], [], [30]);
    // totalIn = 50, cashedOutAmount = 30, net = -20
    const nets = computeNets([player]);
    expect(nets['Dave']).toBeCloseTo(-20);
  });

  it('nets sum to zero across all players', () => {
    const players = [
      makePlayer('Alice', [50], [], [], 80),
      makePlayer('Bob', [50], [], [], 20),
    ];
    const nets = computeNets(players);
    const total = Object.values(nets).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(0);
  });
});

describe('computeTransfers', () => {
  it('produces one transfer for two players', () => {
    // Alice net +30, Bob net -30
    const nets = { Alice: 30, Bob: -30 };
    const transfers = computeTransfers(nets);
    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toEqual<Transfer>({ from: 'Bob', to: 'Alice', amount: 30 });
  });

  it('produces minimum transfers for multiple players', () => {
    // Alice +50, Bob -30, Carol -20
    const nets = { Alice: 50, Bob: -30, Carol: -20 };
    const transfers = computeTransfers(nets);
    expect(transfers).toHaveLength(2);
    const total = transfers.reduce((sum, t) => sum + t.amount, 0);
    expect(total).toBe(50);
  });

  it('returns empty array when all nets are zero', () => {
    expect(computeTransfers({ Alice: 0, Bob: 0 })).toEqual([]);
  });

  it('rounds amounts to 2 decimal places', () => {
    // Use 10.006 to avoid IEEE 754 rounding ambiguity with 10.005
    const nets = { Alice: 10.006, Bob: -10.006 };
    const transfers = computeTransfers(nets);
    expect(transfers[0].amount).toBe(10.01);
  });
});
