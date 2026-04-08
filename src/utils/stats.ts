// src/utils/stats.ts
import { Game } from '../types';
import { round2 } from '../settlement';

export interface PlayerStat {
  name: string;
  gamesPlayed: number;
  totalNet: number;
  biggestWin: number; // 0 if never positive
}

export function computeStats(games: Game[]): PlayerStat[] {
  const map = new Map<string, PlayerStat>();

  for (const game of games) {
    if (game.status !== 'finished') continue;

    for (const player of game.players) {
      const key = player.name.trim().toLowerCase();
      const displayName = player.name.trim();

      const totalIn = player.transactions
        .filter(t => t.type === 'buyin' || t.type === 'rebuy')
        .reduce((sum, t) => sum + t.amount, 0);

      const cashedOut = player.transactions
        .filter(t => t.type === 'cashout')
        .reduce((sum, t) => sum + t.amount, 0);

      const multiplier = game.chipMultiplier ?? 1;
      const finalValue = player.finalChips != null ? player.finalChips / multiplier : cashedOut;
      const net = round2(finalValue - totalIn);

      const existing = map.get(key);
      if (existing) {
        existing.gamesPlayed += 1;
        existing.totalNet = round2(existing.totalNet + net);
        if (net > 0) existing.biggestWin = Math.max(existing.biggestWin, net);
      } else {
        map.set(key, {
          name: displayName,
          gamesPlayed: 1,
          totalNet: net,
          biggestWin: net > 0 ? net : 0,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalNet - a.totalNet);
}
