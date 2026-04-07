// src/utils/whatsapp.ts
import { Transfer } from '../types';

export function buildSummaryURL(transfers: Transfer[], potTotal: number): string {
  let body: string;
  if (transfers.length === 0) {
    body = `No transfers needed — everyone broke even!\n\nTotal pot: $${potTotal.toFixed(2)}`;
  } else {
    const lines = transfers.map(t => `${t.from} → ${t.to}: $${t.amount.toFixed(2)}`);
    body = `${lines.join('\n')}\n\nTotal pot: $${potTotal.toFixed(2)}`;
  }
  const text = `🃏 Poker Night Results\n\n${body}`;
  return `whatsapp://send?text=${encodeURIComponent(text)}`;
}

export function buildTransferURL(
  phone: string,
  from: string,
  to: string,
  amount: number,
): string {
  const text = `Hey ${from} 🃏 Poker night is settled!\nYou owe ${to} $${amount.toFixed(2)}.`;
  return `whatsapp://send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`;
}
