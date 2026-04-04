# PokerSplitter — Design Spec

**Date:** 2026-04-04

## Overview

A cross-platform mobile application (iOS + Android) built with Expo + React Native (TypeScript) that helps poker players manage buy-ins, rebuys, and cash-outs during a game, and calculates the minimum number of money transfers needed to settle up at the end.

No backend. All data stored locally on-device using MMKV.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo (React Native, TypeScript) |
| Navigation | React Navigation (stack navigator) |
| Storage | MMKV (fast local key-value store) |
| Platform | iOS + Android |

---

## Data Model

```ts
type TransactionType = 'buyin' | 'rebuy' | 'cashout';

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  timestamp: number; // Unix ms
}

interface Player {
  id: string;
  name: string;
  transactions: Transaction[];
  finalChips?: number; // set at end of game; undefined if cashed out early
}

interface Game {
  id: string;
  date: number; // Unix ms
  status: 'active' | 'finished';
  players: Player[];
}
```

**Derived values (computed, not stored):**
- `totalIn(player)` = sum of all `buyin` + `rebuy` transaction amounts for that player
- `cashedOutAmount(player)` = sum of all `cashout` transaction amounts for that player
- `net(player)` = `(finalChips ?? cashedOutAmount(player)) − totalIn(player)`
  - If the player cashed out early, `finalChips` is undefined and `cashedOutAmount` is used instead
- `pot` = sum of all `buyin` + `rebuy` transactions across all players (gross; does not subtract cashouts)

---

## Screens

### 1. Home
- Lists all saved games, sorted by date descending
- Each row: date, number of players, status badge (Active / Finished)
- Active games are highlighted
- Tap any game → navigate to its detail (read-only if finished, Active Game screen if active)
- "New Game" button → Game Setup

### 2. Game Setup
- Add player names one by one
- Each player entry includes an initial buy-in amount
- Minimum 2 players to start
- "Start Game" button → Active Game screen

### 3. Active Game
- Header shows total pot
- Player list, each row shows:
  - Name
  - Total amount in (buy-ins + rebuys − cashouts)
  - "Rebuy" button → prompt for amount → adds a `rebuy` transaction
  - "Cash Out" button → prompt for amount → adds a `cashout` transaction, marks player as Out. Only one cash-out per player is allowed; the button is hidden once the player is Out.
- Players who have cashed out are shown greyed out with an "Out" badge
- "End Game" button → Final Chip Count screen

### 4. Final Chip Count
- Lists only players who have NOT cashed out
- Input field per player to enter their final chip count
- Validation: sum of all final chip counts must equal `pot − sum of all cashedOutAmounts`. Shows a warning if mismatch.
- "Calculate" button → Settlement screen

### 5. Settlement
- Displays the minimum number of transfers to settle all debts
- Each row: "[Payer] → [Receiver] · $amount"
- Summary line: "X transfers · Total pot $Y"
- "Share" button: generates a plain-text summary and opens the native share sheet (WhatsApp, iMessage, etc.)
- Game is saved to history with status `finished`

### 6. Game Detail (read-only)
- Accessed from Home for finished games
- Shows: date, player list with their net gain/loss, and the settlement result
- No editing

---

## Settlement Algorithm

The goal is to minimize the number of transfers.

```
1. Compute net[player] = finalValue − totalIn for each player
   (positive = winner, negative = loser)
2. Separate into creditors (net > 0) and debtors (net < 0)
3. Greedy resolution:
   - Take the largest debtor and largest creditor
   - Transfer min(|debtor|, creditor) from debtor to creditor
   - Reduce both balances; remove if zero
   - Repeat until all balances are zero
4. Result: list of (from, to, amount) transfers
```

This greedy approach produces the minimum number of transfers for typical cases.

---

## Storage

All games are stored in MMKV as a JSON-serialized array under the key `"games"`. On app load, the array is read into memory. On every mutation (add player, rebuy, end game, etc.), the array is re-serialized and written back.

Settlement transfers are **not stored** — they are re-derived on demand from the player transaction data using the settlement algorithm. This keeps the stored data minimal and avoids sync issues.

---

## Navigation Structure

```
Stack Navigator
├── HomeScreen
├── GameSetupScreen
├── ActiveGameScreen
├── FinalChipCountScreen
├── SettlementScreen
└── GameDetailScreen
```

Back navigation follows the stack naturally. From Settlement, the back button returns to Home (the stack is reset after a game ends).

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Player cashes out before game ends | Their net is computed from cashout amount, not finalChips. Excluded from chip count screen. |
| Chip count doesn't add up | Warning shown on Final Chip Count screen; user must fix before proceeding. |
| All players break even | Settlement screen shows "No transfers needed." |
| Only 2 players | One transfer at most. |
| App closed mid-game | Active game persists in MMKV; restored on next open. |

---

## Out of Scope

- Cloud sync or multi-device support
- User accounts
- Recurring player contacts/address book
- In-app currency conversion
- Tournament bracket support
