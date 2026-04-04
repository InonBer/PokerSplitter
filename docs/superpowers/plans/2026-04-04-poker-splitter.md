# PokerSplitter Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform Expo mobile app for managing poker game buy-ins, rebuys, cash-outs, and debt settlement.

**Architecture:** All data is stored locally on-device using MMKV (no backend). Business logic (settlement algorithm, derived values) lives in pure TypeScript modules. Screens are thin React Native components that read/write through the storage layer.

**Tech Stack:** Expo (React Native + TypeScript), React Navigation (stack), react-native-mmkv, Jest + @testing-library/react-native

---

## Chunk 1: Project Scaffold + Types + Navigation Shell

### Task 1: Initialize Expo project

**Files:**
- Create: `App.tsx`
- Create: `package.json` (generated)
- Create: `tsconfig.json` (generated)
- Create: `babel.config.js` (generated)
- Create: `app.json` (generated)

- [ ] **Step 1: Scaffold the project**

Note: The git repo is already initialized at `/Users/inonbereshit/Work/PokerSplitter` (with the `docs/` folder committed). Use `.` to scaffold Expo in-place rather than creating a subdirectory.

```bash
cd /Users/inonbereshit/Work/PokerSplitter
npx create-expo-app@latest . --template blank-typescript
```

- [ ] **Step 2: Install dependencies**

```bash
npx expo install react-native-mmkv
npx expo install @react-navigation/native @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 4: Verify the project runs**

```bash
npx expo start
```

Expected: QR code shown, app loads on device/simulator with default Expo screen.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: initialize Expo project with dependencies"
```

---

### Task 2: Define shared types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 3: Set up navigation shell

**Files:**
- Modify: `App.tsx`
- Create: `src/screens/HomeScreen.tsx` (stub)
- Create: `src/screens/GameSetupScreen.tsx` (stub)
- Create: `src/screens/ActiveGameScreen.tsx` (stub)
- Create: `src/screens/FinalChipCountScreen.tsx` (stub)
- Create: `src/screens/SettlementScreen.tsx` (stub)
- Create: `src/screens/GameDetailScreen.tsx` (stub)

- [ ] **Step 1: Create stub screens** (each is just a `<Text>` placeholder)

For each screen file, create a minimal component. Example for `HomeScreen.tsx`:

```tsx
// src/screens/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text>Home</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
```

Repeat for `GameSetupScreen`, `ActiveGameScreen`, `FinalChipCountScreen`, `SettlementScreen`, `GameDetailScreen` — same pattern, different label text.

- [ ] **Step 2: Wire up navigation in `App.tsx`**

```tsx
// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootStackParamList } from './src/types';
import HomeScreen from './src/screens/HomeScreen';
import GameSetupScreen from './src/screens/GameSetupScreen';
import ActiveGameScreen from './src/screens/ActiveGameScreen';
import FinalChipCountScreen from './src/screens/FinalChipCountScreen';
import SettlementScreen from './src/screens/SettlementScreen';
import GameDetailScreen from './src/screens/GameDetailScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'PokerSplitter' }} />
          <Stack.Screen name="GameSetup" component={GameSetupScreen} options={{ title: 'New Game' }} />
          <Stack.Screen name="ActiveGame" component={ActiveGameScreen} options={{ title: 'Game' }} />
          <Stack.Screen name="FinalChipCount" component={FinalChipCountScreen} options={{ title: 'Chip Count' }} />
          <Stack.Screen name="Settlement" component={SettlementScreen} options={{ title: 'Settlement' }} />
          <Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ title: 'Game Detail' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 3: Verify navigation works**

```bash
npx expo start
```

Expected: App loads on HomeScreen showing "Home" text. No errors in console.

- [ ] **Step 4: Commit**

```bash
git add App.tsx src/screens/
git commit -m "feat: set up React Navigation stack with stub screens"
```

---

## Chunk 2: Storage Layer

### Task 4: Implement storage module

**Files:**
- Create: `src/storage.ts`
- Create: `__tests__/storage.test.ts`

The storage module wraps MMKV. It exposes four functions: `loadGames`, `saveGame`, `updateGame`, `deleteGame`. All operate on the `"games"` MMKV key which holds a JSON array of `Game` objects.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/storage.test.ts
import { loadGames, saveGame, updateGame, deleteGame } from '../src/storage';
import { Game } from '../src/types';

// Declare store outside the mock so beforeEach can reset it.
// The arrow functions in the mock capture the `store` binding (not its value),
// so reassigning `store = {}` gives every test a clean slate.
let store: Record<string, string> = {};

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: (key: string) => store[key],
    set: (key: string, value: string) => { store[key] = value; },
  })),
}));

const makeGame = (id: string): Game => ({
  id,
  date: Date.now(),
  status: 'active',
  players: [],
});

beforeEach(() => {
  store = {}; // fresh store before every test — prevents cross-test state bleed
});

describe('loadGames', () => {
  it('returns empty array when storage is empty', () => {
    expect(loadGames()).toEqual([]);
  });
});

describe('saveGame', () => {
  it('adds a game to storage', () => {
    const game = makeGame('g1');
    saveGame(game);
    expect(loadGames()).toContainEqual(game);
  });

  it('does not duplicate a game saved twice', () => {
    const game = makeGame('g2');
    saveGame(game);
    saveGame(game);
    expect(loadGames().filter(g => g.id === 'g2')).toHaveLength(1);
  });
});

describe('updateGame', () => {
  it('updates a game by id', () => {
    const game = makeGame('g3');
    saveGame(game);
    const updated = { ...game, status: 'finished' as const };
    updateGame(updated);
    expect(loadGames().find(g => g.id === 'g3')?.status).toBe('finished');
  });
});

describe('deleteGame', () => {
  it('removes a game by id', () => {
    const game = makeGame('g4');
    saveGame(game);
    deleteGame('g4');
    expect(loadGames().find(g => g.id === 'g4')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/storage.test.ts
```

Expected: FAIL — `../src/storage` not found.

- [ ] **Step 3: Implement `src/storage.ts`**

```ts
// src/storage.ts
import { MMKV } from 'react-native-mmkv';
import { Game } from './types';

const storage = new MMKV();
const GAMES_KEY = 'games';

export function loadGames(): Game[] {
  const raw = storage.getString(GAMES_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Game[];
}

function persistGames(games: Game[]): void {
  storage.set(GAMES_KEY, JSON.stringify(games));
}

export function saveGame(game: Game): void {
  const games = loadGames();
  const exists = games.some(g => g.id === game.id);
  if (exists) return;
  persistGames([...games, game]);
}

export function updateGame(updated: Game): void {
  const games = loadGames().map(g => (g.id === updated.id ? updated : g));
  persistGames(games);
}

export function deleteGame(id: string): void {
  persistGames(loadGames().filter(g => g.id !== id));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/storage.test.ts
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/storage.ts __tests__/storage.test.ts
git commit -m "feat: add MMKV storage layer with tests"
```

---

## Chunk 3: Settlement Algorithm

### Task 5: Implement settlement logic

**Files:**
- Create: `src/settlement.ts`
- Create: `__tests__/settlement.test.ts`

This is the core business logic. Two pure functions: `computeNets` (net gain/loss per player) and `computeTransfers` (minimum transfers to settle).

- [ ] **Step 1: Write failing tests**

```ts
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
    const nets = { Alice: 10.005, Bob: -10.005 };
    const transfers = computeTransfers(nets);
    expect(transfers[0].amount).toBe(10.01);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/settlement.test.ts
```

Expected: FAIL — `../src/settlement` not found.

- [ ] **Step 3: Implement `src/settlement.ts`**

```ts
// src/settlement.ts
import { Player, Transfer } from './types';

/** Returns net gain/loss per player (positive = winner, negative = loser). */
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/settlement.test.ts
```

Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/settlement.ts __tests__/settlement.test.ts
git commit -m "feat: add settlement algorithm with tests"
```

---

## Chunk 4: HomeScreen + GameSetupScreen

### Task 6: Implement HomeScreen

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

HomeScreen loads all games from storage on mount, displays them sorted by date descending, and has a "New Game" button.

- [ ] **Step 1: Implement `HomeScreen.tsx`**

```tsx
// src/screens/HomeScreen.tsx
import React, { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game } from '../types';
import { loadGames } from '../storage';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [games, setGames] = React.useState<Game[]>([]);

  useFocusEffect(
    useCallback(() => {
      const all = loadGames().sort((a, b) => b.date - a.date);
      setGames(all);
    }, []),
  );

  function handleGamePress(game: Game) {
    if (game.status === 'active') {
      navigation.navigate('ActiveGame', { gameId: game.id });
    } else {
      navigation.navigate('GameDetail', { gameId: game.id });
    }
  }

  function renderItem({ item }: ListRenderItemInfo<Game>) {
    const date = new Date(item.date).toLocaleDateString();
    const playerCount = item.players.length;
    const isActive = item.status === 'active';

    return (
      <TouchableOpacity
        style={[styles.row, isActive && styles.activeRow]}
        onPress={() => handleGamePress(item)}
      >
        <View>
          <Text style={styles.rowTitle}>{date}</Text>
          <Text style={styles.rowMeta}>{playerCount} players · {isActive ? 'Active' : 'Finished'}</Text>
        </View>
        <Text style={[styles.chevron, isActive && styles.activeChevron]}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={games}
        keyExtractor={g => g.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No games yet. Start one!</Text>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('GameSetup')}>
        <Text style={styles.fabText}>+ New Game</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, paddingBottom: 80 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeRow: { borderWidth: 1.5, borderColor: '#4CAF50' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  rowMeta: { fontSize: 13, color: '#777', marginTop: 2 },
  chevron: { fontSize: 22, color: '#ccc' },
  activeChevron: { color: '#4CAF50' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 2: Verify on device/simulator**

```bash
npx expo start
```

Expected: HomeScreen shows "No games yet. Start one!" and a "+ New Game" button.

- [ ] **Step 3: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: implement HomeScreen with game list"
```

---

### Task 7: Implement GameSetupScreen

**Files:**
- Modify: `src/screens/GameSetupScreen.tsx`

GameSetupScreen lets the user add players with buy-in amounts, then start the game.

- [ ] **Step 1: Implement `GameSetupScreen.tsx`**

```tsx
// src/screens/GameSetupScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game, Player, Transaction } from '../types';
import { saveGame } from '../storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

type Props = StackScreenProps<RootStackParamList, 'GameSetup'>;

interface PlayerEntry {
  name: string;
  buyIn: string; // string for TextInput; parsed on submit
}

export default function GameSetupScreen({ navigation }: Props) {
  const [players, setPlayers] = useState<PlayerEntry[]>([{ name: '', buyIn: '' }]);

  function addPlayer() {
    setPlayers(prev => [...prev, { name: '', buyIn: '' }]);
  }

  function updatePlayer(index: number, field: keyof PlayerEntry, value: string) {
    setPlayers(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function removePlayer(index: number) {
    setPlayers(prev => prev.filter((_, i) => i !== index));
  }

  function startGame() {
    // Validate
    if (players.length < 2) {
      Alert.alert('Need at least 2 players');
      return;
    }
    for (const p of players) {
      if (!p.name.trim()) {
        Alert.alert('All players need a name');
        return;
      }
      const amount = parseFloat(p.buyIn);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('All buy-in amounts must be positive numbers');
        return;
      }
    }

    const gamePlayers: Player[] = players.map(p => {
      const buyInTx: Transaction = {
        id: uuidv4(),
        type: 'buyin',
        amount: parseFloat(p.buyIn),
        timestamp: Date.now(),
      };
      return { id: uuidv4(), name: p.name.trim(), transactions: [buyInTx] };
    });

    const game: Game = {
      id: uuidv4(),
      date: Date.now(),
      status: 'active',
      players: gamePlayers,
    };

    saveGame(game);
    navigation.replace('ActiveGame', { gameId: game.id });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={players}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <View style={styles.playerRow}>
            <TextInput
              style={[styles.input, styles.nameInput]}
              placeholder="Player name"
              value={item.name}
              onChangeText={v => updatePlayer(index, 'name', v)}
            />
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder="Buy-in $"
              value={item.buyIn}
              keyboardType="decimal-pad"
              onChangeText={v => updatePlayer(index, 'buyIn', v)}
            />
            {players.length > 2 && (
              <TouchableOpacity onPress={() => removePlayer(index)} style={styles.removeBtn}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          <TouchableOpacity style={styles.addBtn} onPress={addPlayer}>
            <Text style={styles.addBtnText}>+ Add Player</Text>
          </TouchableOpacity>
        }
      />
      <TouchableOpacity style={styles.startBtn} onPress={startGame}>
        <Text style={styles.startBtnText}>Start Game</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, paddingBottom: 100 },
  playerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  nameInput: { flex: 1, marginRight: 8 },
  amountInput: { width: 90, marginRight: 8 },
  removeBtn: { padding: 8 },
  removeText: { color: '#e53935', fontSize: 16 },
  addBtn: {
    alignItems: 'center',
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#1a73e8',
    borderRadius: 10,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addBtnText: { color: '#1a73e8', fontSize: 15, fontWeight: '600' },
  startBtn: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 2: Install uuid**

```bash
npm install uuid react-native-get-random-values
npm install --save-dev @types/uuid
```

Add `import 'react-native-get-random-values';` at the top of `App.tsx` (before all other imports).

- [ ] **Step 3: Verify on device/simulator**

Start the app, tap "+ New Game", fill in 2 players, tap "Start Game".
Expected: navigates to ActiveGameScreen stub.

- [ ] **Step 4: Commit**

```bash
git add src/screens/GameSetupScreen.tsx App.tsx
git commit -m "feat: implement GameSetupScreen with player entry and validation"
```

---

## Chunk 5: ActiveGameScreen

### Task 8: Implement PlayerRow component

**Files:**
- Create: `src/components/PlayerRow.tsx`

PlayerRow shows a single player's name, total-in amount, and Rebuy / Cash Out buttons. It is disabled (greyed out) once the player has cashed out.

- [ ] **Step 1: Create `src/components/PlayerRow.tsx`**

```tsx
// src/components/PlayerRow.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Player } from '../types';

interface Props {
  player: Player;
  onRebuy: () => void;
  onCashOut: () => void;
}

function totalIn(player: Player): number {
  return player.transactions
    .filter(t => t.type === 'buyin' || t.type === 'rebuy')
    .reduce((sum, t) => sum + t.amount, 0);
}

function hasCashedOut(player: Player): boolean {
  return player.transactions.some(t => t.type === 'cashout');
}

export default function PlayerRow({ player, onRebuy, onCashOut }: Props) {
  const cashedOut = hasCashedOut(player);
  const inAmount = totalIn(player);
  const rebuyCount = player.transactions.filter(t => t.type === 'rebuy').length;

  return (
    <View style={[styles.row, cashedOut && styles.rowDimmed]}>
      <View style={styles.info}>
        <Text style={styles.name}>{player.name}</Text>
        <Text style={styles.meta}>
          In: ${inAmount.toFixed(2)}{rebuyCount > 0 ? ` · ${rebuyCount} rebuy${rebuyCount > 1 ? 's' : ''}` : ''}
        </Text>
      </View>
      {cashedOut ? (
        <View style={styles.outBadge}>
          <Text style={styles.outText}>Out</Text>
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.rebuyBtn} onPress={onRebuy}>
            <Text style={styles.rebuyText}>Rebuy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cashOutBtn} onPress={onCashOut}>
            <Text style={styles.cashOutText}>Cash Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rowDimmed: { opacity: 0.45 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#111' },
  meta: { fontSize: 13, color: '#777', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  rebuyBtn: {
    backgroundColor: '#e8f0fe',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rebuyText: { color: '#1a73e8', fontWeight: '600', fontSize: 13 },
  cashOutBtn: {
    backgroundColor: '#fce8e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cashOutText: { color: '#e53935', fontWeight: '600', fontSize: 13 },
  outBadge: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  outText: { color: '#999', fontWeight: '600', fontSize: 13 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PlayerRow.tsx
git commit -m "feat: add PlayerRow component"
```

---

### Task 9: Implement ActiveGameScreen

**Files:**
- Modify: `src/screens/ActiveGameScreen.tsx`

ActiveGameScreen loads the game, shows the total pot in the header, lists players via `PlayerRow`, and has an "End Game" button. Rebuy and Cash Out open an `Alert.prompt` for the amount.

- [ ] **Step 1: Implement `ActiveGameScreen.tsx`**

```tsx
// src/screens/ActiveGameScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game, Transaction } from '../types';
import { loadGames, updateGame } from '../storage';
import PlayerRow from '../components/PlayerRow';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

type Props = StackScreenProps<RootStackParamList, 'ActiveGame'>;

export default function ActiveGameScreen({ route, navigation }: Props) {
  const { gameId } = route.params;
  const [game, setGame] = useState<Game | null>(null);

  useFocusEffect(
    useCallback(() => {
      const found = loadGames().find(g => g.id === gameId) ?? null;
      setGame(found);
      if (found) {
        navigation.setOptions({ title: `Pot: $${pot(found).toFixed(2)}` });
      }
    }, [gameId]),
  );

  function pot(g: Game): number {
    return g.players.flatMap(p => p.transactions)
      .filter(t => t.type === 'buyin' || t.type === 'rebuy')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  function addTransaction(playerId: string, type: 'rebuy' | 'cashout', amount: number) {
    if (!game) return;
    const tx: Transaction = { id: uuidv4(), type, amount, timestamp: Date.now() };
    const updated: Game = {
      ...game,
      players: game.players.map(p =>
        p.id === playerId ? { ...p, transactions: [...p.transactions, tx] } : p,
      ),
    };
    updateGame(updated);
    setGame(updated);
    navigation.setOptions({ title: `Pot: $${pot(updated).toFixed(2)}` });
  }

  function promptAmount(title: string, onConfirm: (amount: number) => void) {
    Alert.prompt(
      title,
      'Enter amount:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: (value?: string) => {
            const amount = parseFloat(value ?? '');
            if (isNaN(amount) || amount <= 0) {
              Alert.alert('Enter a valid positive amount');
              return;
            }
            onConfirm(amount);
          },
        },
      ],
      'plain-text',
      '',
      'decimal-pad',
    );
  }

  function handleRebuy(playerId: string) {
    promptAmount('Rebuy', amount => addTransaction(playerId, 'rebuy', amount));
  }

  function handleCashOut(playerId: string) {
    promptAmount('Cash Out', amount => addTransaction(playerId, 'cashout', amount));
  }

  function handleEndGame() {
    Alert.alert('End Game', 'Are you sure you want to end the game?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Game',
        style: 'destructive',
        onPress: () => navigation.navigate('FinalChipCount', { gameId }),
      },
    ]);
  }

  if (!game) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={game.players}
        keyExtractor={p => p.id}
        renderItem={({ item }) => (
          <PlayerRow
            player={item}
            onRebuy={() => handleRebuy(item.id)}
            onCashOut={() => handleCashOut(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
      />
      <TouchableOpacity style={styles.endBtn} onPress={handleEndGame}>
        <Text style={styles.endBtnText}>End Game</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, paddingBottom: 100 },
  endBtn: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#e53935',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  endBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 2: Verify on device/simulator**

Start a new game with 2 players. Verify:
- Pot total shown in header
- Rebuy adds to a player's total
- Cash Out greys out the player with "Out" badge
- "End Game" → confirmation → FinalChipCountScreen (stub created in Task 3 is sufficient here — full implementation comes in Chunk 6)

- [ ] **Step 3: Commit**

```bash
git add src/screens/ActiveGameScreen.tsx
git commit -m "feat: implement ActiveGameScreen with rebuy, cash-out, and end game"
```

---

## Chunk 6: FinalChipCountScreen + SettlementScreen

### Task 10: Implement FinalChipCountScreen

**Files:**
- Modify: `src/screens/FinalChipCountScreen.tsx`

Shows only players who have NOT cashed out. User enters final chip counts. Validates that sum equals `pot − totalCashedOut`. On success, saves chip counts and navigates to Settlement.

- [ ] **Step 1: Implement `FinalChipCountScreen.tsx`**

```tsx
// src/screens/FinalChipCountScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game, Player } from '../types';
import { loadGames, updateGame } from '../storage';

type Props = StackScreenProps<RootStackParamList, 'FinalChipCount'>;

export default function FinalChipCountScreen({ route, navigation }: Props) {
  const { gameId } = route.params;
  const [game, setGame] = useState<Game | null>(null);
  const [chipCounts, setChipCounts] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      const found = loadGames().find(g => g.id === gameId) ?? null;
      setGame(found);
    }, [gameId]),
  );

  if (!game) return null;

  const activePlayers = game.players.filter(
    p => !p.transactions.some(t => t.type === 'cashout'),
  );

  function totalPot(): number {
    return game!.players.flatMap(p => p.transactions)
      .filter(t => t.type === 'buyin' || t.type === 'rebuy')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  function totalCashedOut(): number {
    return game!.players.flatMap(p => p.transactions)
      .filter(t => t.type === 'cashout')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  function expectedChips(): number {
    return totalPot() - totalCashedOut();
  }

  function enteredTotal(): number {
    return Object.values(chipCounts)
      .map(v => parseFloat(v) || 0)
      .reduce((a, b) => a + b, 0);
  }

  function handleCalculate() {
    for (const p of activePlayers) {
      const val = parseFloat(chipCounts[p.id] ?? '');
      if (isNaN(val) || val < 0) {
        Alert.alert('Enter chip counts', `Missing or invalid amount for ${p.name}`);
        return;
      }
    }

    const entered = Math.round(enteredTotal() * 100);
    const expected = Math.round(expectedChips() * 100);

    if (entered !== expected) {
      Alert.alert(
        'Chip count mismatch',
        `Total entered: $${(entered / 100).toFixed(2)}\nExpected: $${(expected / 100).toFixed(2)}\n\nPlease recount and try again.`,
      );
      return;
    }

    // Save final chip counts
    const updated: Game = {
      ...game!,
      players: game!.players.map(p => {
        const chips = parseFloat(chipCounts[p.id] ?? '');
        return isNaN(chips) ? p : { ...p, finalChips: chips };
      }),
    };
    updateGame(updated);
    navigation.navigate('Settlement', { gameId });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={activePlayers}
        keyExtractor={p => p.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <TextInput
              style={styles.input}
              placeholder="Chips $"
              keyboardType="decimal-pad"
              value={chipCounts[item.id] ?? ''}
              onChangeText={v => setChipCounts(prev => ({ ...prev, [item.id]: v }))}
            />
          </View>
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.hint}>
            Expected total: ${expectedChips().toFixed(2)}
          </Text>
        }
      />
      <TouchableOpacity style={styles.calcBtn} onPress={handleCalculate}>
        <Text style={styles.calcBtnText}>Calculate Settlement</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, paddingBottom: 100 },
  hint: { fontSize: 14, color: '#555', marginBottom: 16, textAlign: 'center' },
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  name: { fontSize: 16, fontWeight: '600', color: '#111' },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    width: 110,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  calcBtn: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  calcBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/FinalChipCountScreen.tsx
git commit -m "feat: implement FinalChipCountScreen with chip validation"
```

---

### Task 11: Implement TransferRow component

**Files:**
- Create: `src/components/TransferRow.tsx`

- [ ] **Step 1: Create `src/components/TransferRow.tsx`**

```tsx
// src/components/TransferRow.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Transfer } from '../types';

interface Props {
  transfer: Transfer;
}

export default function TransferRow({ transfer }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.from}>{transfer.from}</Text>
      <Text style={styles.arrow}> → </Text>
      <Text style={styles.to}>{transfer.to}</Text>
      <View style={styles.spacer} />
      <Text style={styles.amount}>${transfer.amount.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  from: { fontSize: 16, fontWeight: '600', color: '#e53935' },
  arrow: { fontSize: 16, color: '#999' },
  to: { fontSize: 16, fontWeight: '600', color: '#2e7d32' },
  spacer: { flex: 1 },
  amount: { fontSize: 18, fontWeight: '700', color: '#111' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TransferRow.tsx
git commit -m "feat: add TransferRow component"
```

---

### Task 12: Implement SettlementScreen

**Files:**
- Modify: `src/screens/SettlementScreen.tsx`

Loads the finished game, computes nets and transfers, displays them, marks the game as finished, and provides a Share button.

- [ ] **Step 1: Implement `SettlementScreen.tsx`**

```tsx
// src/screens/SettlementScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game, Transfer } from '../types';
import { loadGames, updateGame } from '../storage';
import { computeNets, computeTransfers } from '../settlement';
import TransferRow from '../components/TransferRow';

type Props = StackScreenProps<RootStackParamList, 'Settlement'>;

export default function SettlementScreen({ route, navigation }: Props) {
  const { gameId } = route.params;
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [pot, setPot] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const game = loadGames().find(g => g.id === gameId);
      if (!game) return;

      // Mark as finished if not already
      if (game.status !== 'finished') {
        updateGame({ ...game, status: 'finished' });
      }

      const totalPot = game.players.flatMap(p => p.transactions)
        .filter(t => t.type === 'buyin' || t.type === 'rebuy')
        .reduce((sum, t) => sum + t.amount, 0);

      const nets = computeNets(game.players);
      const result = computeTransfers(nets);
      setPot(totalPot);
      setTransfers(result);

      // Hide back button — "Done" resets the stack to Home.
      // Note: this relies on FinalChipCountScreen having already called updateGame()
      // with finalChips set before navigating here. Do not reorder those two screens.
      navigation.setOptions({ headerLeft: () => null });
    }, [gameId]),
  );

  async function handleShare() {
    const lines = transfers.length === 0
      ? ['No transfers needed — everyone broke even!']
      : transfers.map(t => `${t.from} → ${t.to}: $${t.amount.toFixed(2)}`);
    const message = `Poker Settlement\n\n${lines.join('\n')}\n\nTotal pot: $${pot.toFixed(2)}`;
    await Share.share({ message });
  }

  function handleDone() {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

  return (
    <View style={styles.container}>
      {transfers.length === 0 ? (
        <View style={styles.evenContainer}>
          <Text style={styles.evenText}>No transfers needed!</Text>
          <Text style={styles.evenSub}>Everyone broke even.</Text>
        </View>
      ) : (
        <FlatList
          data={transfers}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <TransferRow transfer={item} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.header}>
              {transfers.length} transfer{transfers.length !== 1 ? 's' : ''} · Total pot ${pot.toFixed(2)}
            </Text>
          }
        />
      )}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Share Results</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, paddingBottom: 160 },
  header: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 16 },
  evenContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  evenText: { fontSize: 22, fontWeight: '700', color: '#2e7d32' },
  evenSub: { fontSize: 15, color: '#777', marginTop: 8 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    gap: 10,
  },
  shareBtn: {
    backgroundColor: '#2e7d32',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  doneBtn: {
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 2: Verify full flow on device/simulator**

Run a full game:
1. New Game → add 2-3 players → Start
2. Rebuy one player, cash out another
3. End Game → enter chip counts → Calculate
4. Verify settlement shows correct transfers
5. Tap "Share" → native share sheet appears
6. Tap "Done" → returns to Home with game shown as Finished

- [ ] **Step 3: Commit**

```bash
git add src/screens/SettlementScreen.tsx
git commit -m "feat: implement SettlementScreen with transfers and share"
```

---

## Chunk 7: GameDetailScreen + Polish

### Task 13: Implement GameDetailScreen

**Files:**
- Modify: `src/screens/GameDetailScreen.tsx`

Read-only view of a finished game: player list with net gain/loss, and the settlement transfers.

- [ ] **Step 1: Implement `GameDetailScreen.tsx`**

```tsx
// src/screens/GameDetailScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, SectionList, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game, Transfer } from '../types';
import { loadGames } from '../storage';
import { computeNets, computeTransfers } from '../settlement';
import TransferRow from '../components/TransferRow';

type Props = StackScreenProps<RootStackParamList, 'GameDetail'>;

export default function GameDetailScreen({ route }: Props) {
  const { gameId } = route.params;
  const [game, setGame] = useState<Game | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  useFocusEffect(
    useCallback(() => {
      const found = loadGames().find(g => g.id === gameId) ?? null;
      setGame(found);
      if (found) {
        const nets = computeNets(found.players);
        setTransfers(computeTransfers(nets));
      }
    }, [gameId]),
  );

  if (!game) return null;

  // computeNets returns Record<playerName, net> — keyed by name, not id.
  // This matches the settlement.ts implementation in Task 5.
  const nets = computeNets(game.players);
  const gameDate = new Date(game.date).toLocaleDateString();

  // Use a stable `type` field to discriminate sections in renderItem —
  // never use `title` for this since it can be a dynamic string.
  const playerSection = {
    title: `Players · ${gameDate}`,
    type: 'players' as const,
    data: game.players.map(p => ({
      key: p.id,
      name: p.name,
      net: nets[p.name] ?? 0,
    })),
  };

  const transferSection = {
    title: 'Settlement',
    type: 'transfers' as const,
    data: transfers.map((t, i) => ({ key: String(i), transfer: t })),
  };

  return (
    <SectionList
      sections={[playerSection, transferSection]}
      keyExtractor={item => item.key}
      contentContainerStyle={styles.list}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      renderItem={({ item, section }) => {
        if ((section as typeof playerSection).type === 'players') {
          const { name, net } = item as typeof playerSection.data[0];
          const isWinner = net > 0;
          return (
            <View style={styles.playerRow}>
              <Text style={styles.playerName}>{name}</Text>
              <Text style={[styles.net, isWinner ? styles.netPos : styles.netNeg]}>
                {isWinner ? '+' : ''}${net.toFixed(2)}
              </Text>
            </View>
          );
        }
        const { transfer } = item as typeof transferSection.data[0];
        return <TransferRow transfer={transfer} />;
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#777',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  playerRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  playerName: { fontSize: 16, fontWeight: '600', color: '#111' },
  net: { fontSize: 17, fontWeight: '700' },
  netPos: { color: '#2e7d32' },
  netNeg: { color: '#e53935' },
});
```

- [ ] **Step 2: Verify on device/simulator**

From Home, tap a finished game. Verify player net gains/losses and settlement transfers are shown correctly (read-only, no buttons).

- [ ] **Step 3: Commit**

```bash
git add src/screens/GameDetailScreen.tsx
git commit -m "feat: implement GameDetailScreen with net results and settlement"
```

---

### Task 14: Polish — Android Alert.prompt fix

**Files:**
- Create: `src/components/AmountModal.tsx`
- Modify: `src/screens/ActiveGameScreen.tsx`

`Alert.prompt` is iOS-only. On Android, replace it with a simple modal.

- [ ] **Step 1: Create `src/components/AmountModal.tsx`**

```tsx
// src/components/AmountModal.tsx
import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';

interface Props {
  visible: boolean;
  title: string;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}

export default function AmountModal({ visible, title, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState('');

  function handleConfirm() {
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > 0) {
      onConfirm(amount);
      setValue('');
    }
  }

  function handleCancel() {
    setValue('');
    onCancel();
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            keyboardType="decimal-pad"
            value={value}
            onChangeText={setValue}
            autoFocus
          />
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    width: '80%',
  },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 16, color: '#111' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { padding: 10 },
  cancelText: { color: '#777', fontSize: 15 },
  confirmBtn: {
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
```

- [ ] **Step 2: Update `ActiveGameScreen.tsx` to use `AmountModal`**

Replace the `promptAmount` function and add modal state:

```tsx
// Add to imports
import { Platform } from 'react-native';
import AmountModal from '../components/AmountModal';

// Add state inside component
const [modal, setModal] = useState<{ title: string; onConfirm: (n: number) => void } | null>(null);

// Replace promptAmount:
function promptAmount(title: string, onConfirm: (amount: number) => void) {
  if (Platform.OS === 'ios') {
    Alert.prompt(title, 'Enter amount:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: (value?: string) => {
          const amount = parseFloat(value ?? '');
          if (isNaN(amount) || amount <= 0) {
            Alert.alert('Enter a valid positive amount');
            return;
          }
          onConfirm(amount);
        },
      },
    ], 'plain-text', '', 'decimal-pad');
  } else {
    setModal({ title, onConfirm });
  }
}

// Add this JSX immediately before the closing </View> in the return statement:
{modal && (
  <AmountModal
    visible
    title={modal.title}
    onConfirm={amount => { modal.onConfirm(amount); setModal(null); }}
    onCancel={() => setModal(null)}
  />
)}
```

- [ ] **Step 3: Verify on Android emulator**

Run the app on an Android emulator. Tap "Rebuy" on a player.
Expected: `AmountModal` appears (not `Alert.prompt`). Entering an amount and tapping Confirm updates the player's total. Tapping Cancel dismisses without changes.

- [ ] **Step 4: Commit**

```bash
git add src/components/AmountModal.tsx src/screens/ActiveGameScreen.tsx
git commit -m "feat: add cross-platform AmountModal for rebuy and cash-out on Android"
```

---

### Task 15: Final run of all tests

- [ ] **Step 1: Run the full test suite**

```bash
npx jest
```

Expected: All tests pass. No failures.

- [ ] **Step 2: Smoke-test full flow on both platforms**

Test the complete flow on iOS simulator and Android emulator:
1. Create a game with 3 players
2. Rebuy one player
3. Cash out one player early
4. End game → enter chip counts → confirm mismatch warning works → enter correct counts
5. Verify settlement screen shows correct transfers
6. Share results
7. Done → Home shows finished game
8. Tap finished game → GameDetail shows correct data

- [ ] **Step 3: Final commit**

```bash
git add src/ App.tsx __tests__/
git commit -m "chore: final smoke test pass, app complete"
```
