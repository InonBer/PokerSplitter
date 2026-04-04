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
  finalChips?: number; // undefined until end-of-game chip count is entered
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
}

// Navigation param types
export type RootStackParamList = {
  Home: undefined;
  GameSetup: undefined;
  ActiveGame: { gameId: string };
  FinalChipCount: { gameId: string };
  Settlement: { gameId: string };
  GameDetail: { gameId: string };
};
