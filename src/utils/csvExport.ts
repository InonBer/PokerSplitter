// src/utils/csvExport.ts
import { Game } from '../types';
import { computeNets, computeTransfers } from '../settlement';

function formatNet(n: number): string {
  const abs = Math.abs(n).toFixed(2);
  if (n > 0) return `+${abs}`;
  if (n < 0) return `-${abs}`;
  return '0.00';
}

function gameLabel(game: Game): string {
  return game.name ?? 'Unnamed Game';
}

function dateStr(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function playerRows(game: Game): string[] {
  const label = gameLabel(game);
  const date = dateStr(game.date);
  return game.players.map(player => {
    const totalIn = player.transactions
      .filter(t => t.type === 'buyin' || t.type === 'rebuy')
      .reduce((sum, t) => sum + t.amount, 0);
    const cashedOut = player.transactions
      .filter(t => t.type === 'cashout')
      .reduce((sum, t) => sum + t.amount, 0);
    const finalValue = player.finalChips ?? cashedOut;
    const net = Math.round((finalValue - totalIn) * 100) / 100;
    return `${label},${date},${player.name},${totalIn.toFixed(2)},${finalValue.toFixed(2)},${formatNet(net)}`;
  });
}

const PLAYER_HEADER = 'Game,Date,Player,Total In,Cash Out / Final Chips,Net';

export function generateSingleGameCSV(game: Game): string {
  const lines: string[] = [PLAYER_HEADER, ...playerRows(game), ''];

  lines.push('Transfers');
  lines.push('From,To,Amount');
  try {
    const nets = computeNets(game.players);
    const transfers = computeTransfers(nets);
    for (const t of transfers) {
      lines.push(`${t.from},${t.to},${t.amount.toFixed(2)}`);
    }
  } catch {
    // Malformed game — omit transfers
  }

  return lines.join('\n');
}

export function generateAllGamesCSV(games: Game[]): string {
  const chunks = games
    .filter(g => g.status === 'finished')
    .map(game => [PLAYER_HEADER, ...playerRows(game)].join('\n'));
  return chunks.join('\n\n');
}
