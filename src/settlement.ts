// src/settlement.ts
import { Player, Transfer } from './types';

/** Returns net gain/loss per player (positive = winner, negative = loser).
 *  Keyed by player name (not id) — matches how transfers reference players.
 */
export function computeNets(players: Player[]): Record<string, number> {
  const nets: Record<string, number> = {};

  for (const player of players) {
    const totalIn = player.transactions
      .filter(t => t.type === 'buyin' || t.type === 'rebuy')
      .reduce((sum, t) => sum + t.amount, 0);

    const cashedOutAmount = player.transactions
      .filter(t => t.type === 'cashout')
      .reduce((sum, t) => sum + t.amount, 0);

    const finalValue = player.finalChips ?? cashedOutAmount;
    nets[player.name] = round2(finalValue - totalIn);
  }

  return nets;
}

/**
 * Greedy algorithm: minimize the number of transfers to settle all debts.
 * Returns a list of (from, to, amount) transfers.
 */
export function computeTransfers(nets: Record<string, number>): Transfer[] {
  const creditors: { name: string; amount: number }[] = [];
  const debtors: { name: string; amount: number }[] = [];

  for (const [name, net] of Object.entries(nets)) {
    if (net > 0.001) creditors.push({ name, amount: net });
    else if (net < -0.001) debtors.push({ name, amount: -net });
  }

  const transfers: Transfer[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    // Sort descending so we always process largest first
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = round2(Math.min(creditor.amount, debtor.amount));

    transfers.push({ from: debtor.name, to: creditor.name, amount });

    creditor.amount = round2(creditor.amount - amount);
    debtor.amount = round2(debtor.amount - amount);

    if (creditor.amount < 0.001) creditors.shift();
    if (debtor.amount < 0.001) debtors.shift();
  }

  return transfers;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
