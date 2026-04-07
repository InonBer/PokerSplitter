// src/utils/whatsapp.ts
import { Transfer } from '../types';
import i18n from '../i18n';

export function buildSummaryURL(transfers: Transfer[], potTotal: number): string {
  const t = i18n.t.bind(i18n);
  const arrow = t('common.arrow');
  let body: string;
  if (transfers.length === 0) {
    body = t('whatsapp.noTransfers');
  } else {
    const lines = transfers.map(tr =>
      t('whatsapp.transferLine', { from: tr.from, arrow, to: tr.to, amount: tr.amount.toFixed(2) })
    );
    body = lines.join('\n');
  }
  const text = `${t('whatsapp.title')}\n\n${body}\n\n${t('whatsapp.totalPot', { amount: potTotal.toFixed(2) })}`;
  return `whatsapp://send?text=${encodeURIComponent(text)}`;
}

export function buildTransferURL(
  phone: string,
  from: string,
  to: string,
  amount: number,
): string {
  const t = i18n.t.bind(i18n);
  const text = t('whatsapp.personalMsg', { from, to, amount: amount.toFixed(2) });
  return `whatsapp://send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`;
}
