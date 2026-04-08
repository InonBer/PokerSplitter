// src/types.ts

export type TransactionType = 'buyin' | 'rebuy' | 'cashout';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  timestamp: number; // Unix ms
}

export interface Player {
  id: string;
  name: string;
  transactions: Transaction[];
  finalChips?: number;
  phone?: string; // E.164 format; set when player is linked to a contact
}

export interface Transfer {
  from: string; // player name
  to: string;   // player name
  amount: number;
}

export interface Game {
  id: string;
  date: number; // Unix ms
  status: 'active' | 'finished';
  players: Player[];
  name?: string; // optional game name e.g. "Friday Night"
  chipMultiplier?: number; // e.g. 10 means 1 unit of money = 10 chips
}

export interface Contact {
  id: string;
  name: string;
  phone?: string; // E.164 format e.g. "+972501234567"
}

// Navigation param types
export type RootStackParamList = {
  Home: undefined;
  GameSetup: undefined;
  ActiveGame: { gameId: string };
  FinalChipCount: { gameId: string };
  Settlement: { gameId: string };
  GameDetail: { gameId: string };
  Paywall: undefined;
  Stats: undefined;
  Settings: undefined;
  Contacts: undefined;
};
