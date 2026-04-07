# PokerSplitter Pro Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add freemium monetization (RevenueCat one-time Pro unlock at $2.99) plus player contacts, WhatsApp integration, stats, CSV export, and backup/restore to the existing PokerSplitter app.

**Architecture:** A `useProStatus()` hook (reads MMKV cache, syncs with RevenueCat on launch) provides the isPro boolean throughout the app. A `requirePro()` helper gates Pro features by navigating to PaywallScreen. All new business logic (stats, CSV, backup, WhatsApp URLs) lives in pure utility functions under `src/utils/` and is covered by unit tests. UI screens are thin consumers of these utilities.

**Tech Stack:** Expo + React Native + TypeScript, react-native-purchases (RevenueCat), expo-document-picker, expo-file-system, react-native-mmkv (already installed), jest-expo (already installed).

---

## File Structure

**New files:**
- `app.config.js` — created alongside `app.json`; dynamic Expo config for env var resolution (`...config` spreads from `app.json`)
- `src/types.ts` — extend (Contact interface, Game.name, 4 new route entries)
- `src/storage.ts` — extend (contacts CRUD, isPro cache)
- `src/hooks/useProStatus.ts` — reactive isPro boolean via MMKV + RevenueCat
- `src/utils/proGate.ts` — `requirePro()` helper
- `src/utils/stats.ts` — `computeStats()` pure function
- `src/utils/csvExport.ts` — `generateSingleGameCSV()`, `generateAllGamesCSV()`
- `src/utils/backup.ts` — `validateBackup()`, `serializeBackup()`
- `src/utils/whatsapp.ts` — `buildSummaryURL()`, `buildTransferURL()`
- `src/screens/PaywallScreen.tsx` — purchase + restore UI
- `src/screens/SettingsScreen.tsx` — currency, contacts nav, export, backup/restore, Pro badge
- `src/screens/ContactsScreen.tsx` — add/edit/delete contacts with phone validation
- `src/screens/StatsScreen.tsx` — all-time leaderboard
- `src/components/ContactPickerModal.tsx` — full-screen modal with search
- `__tests__/storage.test.ts` — extend with contacts + isPro tests
- `__tests__/stats.test.ts`
- `__tests__/csvExport.test.ts`
- `__tests__/backup.test.ts`
- `__tests__/whatsapp.test.ts`

**Modified files:**
- `App.tsx` — RevenueCat init before NavigationContainer, 4 new screens registered
- `src/screens/HomeScreen.tsx` — game count indicator, Settings + Stats buttons, Pro badge
- `src/screens/GameSetupScreen.tsx` — optional game name (Pro), contact picker button (Pro)
- `src/screens/SettlementScreen.tsx` — WhatsApp section (Pro gated)
- `src/screens/GameDetailScreen.tsx` — show game name in header, Export CSV button (Pro)

---

## Chunk 1: Foundation

### Task 1: Install dependencies + migrate to app.config.js

**Files:**
- Keep: `app.json` (must remain — `app.config.js` spreads `...config` from it)
- Create: `app.config.js`

- [ ] **Step 1: Install new native dependencies**

```bash
npx expo install react-native-purchases expo-document-picker expo-file-system expo-build-properties
```

Expected: packages added to `node_modules` and listed in `package.json`.

- [ ] **Step 2: Create `app.config.js` alongside `app.json` (do NOT delete app.json)**

```js
// app.config.js
export default ({ config }) => ({
  ...config,
  name: 'PokerSplitter',
  slug: 'PokerSplitter',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    ...config.ios,
    supportsTablet: true,
    bundleIdentifier: 'com.anonymous.PokerSplitter',
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      LSApplicationQueriesSchemes: ['whatsapp'],
    },
  },
  android: {
    ...config.android,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.anonymous.PokerSplitter',
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    ...(config.plugins ?? []),
    // react-native-purchases plugin handles native setup; runtime key selection
    // is done in App.tsx via Purchases.configure() using Platform.OS.
    'react-native-purchases',
    [
      'expo-build-properties',
      {
        android: { minSdkVersion: 24 },
      },
    ],
  ],
});
```

- [ ] **Step 3: Create `.env` file with placeholder keys (not committed)**

```bash
cat > .env << 'EOF'
EXPO_PUBLIC_RC_IOS_KEY=your_revenuecat_ios_key_here
EXPO_PUBLIC_RC_ANDROID_KEY=your_revenuecat_android_key_here
EOF
echo ".env" >> .gitignore
```

- [ ] **Step 4: Verify Expo can read the config**

```bash
npx expo config --type public 2>&1 | grep '"name"'
```

Expected: `"name": "PokerSplitter"`

- [ ] **Step 5: Commit**

```bash
git add app.config.js .gitignore
git commit -m "chore: migrate to app.config.js, add RevenueCat + file system deps"
```

---

### Task 2: Extend types

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Update `src/types.ts`**

Replace the entire file:

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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors), or only pre-existing unrelated warnings.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: extend types — Contact, Game.name, 4 new route entries"
```

---

### Task 3: Extend storage (contacts + isPro)

**Files:**
- Modify: `src/storage.ts`
- Modify: `__tests__/storage.test.ts`

- [ ] **Step 1: Write failing tests for contacts + isPro functions**

Add to the bottom of `__tests__/storage.test.ts`:

```ts
// --- Contacts ---

describe('loadContacts', () => {
  it('returns empty array when nothing stored', () => {
    expect(loadContacts()).toEqual([]);
  });
});

describe('saveContact', () => {
  it('stores a contact and loadContacts returns it', () => {
    const c: Contact = { id: 'c1', name: 'Dan' };
    saveContact(c);
    expect(loadContacts()).toEqual([c]);
  });

  it('ignores duplicate id', () => {
    const c: Contact = { id: 'c1', name: 'Dan' };
    saveContact(c);
    saveContact(c);
    expect(loadContacts()).toHaveLength(1);
  });
});

describe('updateContact', () => {
  it('replaces the contact with matching id', () => {
    saveContact({ id: 'c1', name: 'Dan' });
    updateContact({ id: 'c1', name: 'Danny', phone: '+1234567890' });
    expect(loadContacts()[0].name).toBe('Danny');
  });
});

describe('deleteContact', () => {
  it('removes contact by id', () => {
    saveContact({ id: 'c1', name: 'Dan' });
    deleteContact('c1');
    expect(loadContacts()).toEqual([]);
  });
});

// --- isPro ---

describe('loadIsPro / setIsPro', () => {
  it('defaults to false', () => {
    expect(loadIsPro()).toBe(false);
  });

  it('persists true', () => {
    setIsPro(true);
    expect(loadIsPro()).toBe(true);
  });

  it('persists false', () => {
    setIsPro(true);
    setIsPro(false);
    expect(loadIsPro()).toBe(false);
  });
});
```

Also add to imports at the top of the test file:
```ts
import { loadContacts, saveContact, updateContact, deleteContact, loadIsPro, setIsPro } from '../src/storage';
import { Contact } from '../src/types';
```

Update `beforeEach` to reset all keys using `__setMockStore({})` (Step 4 wires this up; skip this sub-step and let Step 4 consolidate the reset).

- [ ] **Step 2: Run — expect failures**

```bash
npx jest __tests__/storage.test.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `loadContacts is not a function` (or similar).

- [ ] **Step 3: Implement contacts + isPro in `src/storage.ts`**

Replace the full file:

```ts
// src/storage.ts
import { createMMKV } from 'react-native-mmkv';
import { Game, Contact } from './types';

const storage = createMMKV();

const GAMES_KEY = 'games';
const CONTACTS_KEY = 'contacts';
const IS_PRO_KEY = 'isPro';

// ── Games ────────────────────────────────────────────────────────────────────

export function loadGames(): Game[] {
  const raw = storage.getString(GAMES_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as Game[]; } catch { return []; }
}

function persistGames(games: Game[]): void {
  storage.set(GAMES_KEY, JSON.stringify(games));
}

export function saveGame(game: Game): void {
  const games = loadGames();
  if (games.some(g => g.id === game.id)) return;
  persistGames([...games, game]);
}

export function updateGame(updated: Game): void {
  persistGames(loadGames().map(g => (g.id === updated.id ? updated : g)));
}

export function deleteGame(id: string): void {
  persistGames(loadGames().filter(g => g.id !== id));
}

// ── Contacts ─────────────────────────────────────────────────────────────────

export function loadContacts(): Contact[] {
  const raw = storage.getString(CONTACTS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as Contact[]; } catch { return []; }
}

function persistContacts(contacts: Contact[]): void {
  storage.set(CONTACTS_KEY, JSON.stringify(contacts));
}

export function saveContact(contact: Contact): void {
  const contacts = loadContacts();
  if (contacts.some(c => c.id === contact.id)) return;
  persistContacts([...contacts, contact]);
}

export function updateContact(updated: Contact): void {
  persistContacts(loadContacts().map(c => (c.id === updated.id ? updated : c)));
}

export function deleteContact(id: string): void {
  persistContacts(loadContacts().filter(c => c.id !== id));
}

// ── Pro status ───────────────────────────────────────────────────────────────

export function loadIsPro(): boolean {
  return storage.getBoolean(IS_PRO_KEY) ?? false;
}

export function setIsPro(value: boolean): void {
  storage.set(IS_PRO_KEY, value);
}
```

- [ ] **Step 4: Update the mock in `__tests__/storage.test.ts`**

The existing `jest.mock('react-native-mmkv', ...)` mock uses a `mockStore` object. It needs to support `getBoolean` in addition to `getString`/`set`. Update the mock factory:

```ts
jest.mock('react-native-mmkv', () => {
  let mockStore: Record<string, string | boolean | undefined> = {};
  return {
    createMMKV: () => ({
      getString: (key: string) =>
        typeof mockStore[key] === 'string' ? (mockStore[key] as string) : undefined,
      getBoolean: (key: string) =>
        typeof mockStore[key] === 'boolean' ? (mockStore[key] as boolean) : undefined,
      set: (key: string, value: string | boolean) => { mockStore[key] = value; },
    }),
    __setMockStore: (s: Record<string, string | boolean | undefined>) => { mockStore = s; },
    __getMockStore: () => mockStore,
  };
});
```

And update `beforeEach` to reset all keys:

```ts
beforeEach(() => {
  // Access internal mock store and reset it
  const mmkv = require('react-native-mmkv');
  mmkv.__setMockStore({});
});
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx jest __tests__/storage.test.ts --no-coverage 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/storage.ts src/types.ts __tests__/storage.test.ts
git commit -m "feat: extend storage with contacts CRUD and isPro cache"
```

---

### Task 4: Pro gate — useProStatus hook + requirePro helper

**Files:**
- Create: `src/hooks/useProStatus.ts`
- Create: `src/utils/proGate.ts`

No unit tests for this task (the hook calls RevenueCat which requires a native runtime; proGate is two lines).

- [ ] **Step 1: Create `src/hooks/useProStatus.ts`**

```ts
// src/hooks/useProStatus.ts
import { useState, useEffect, useRef } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { loadIsPro, setIsPro } from '../storage';

function isProFromInfo(info: CustomerInfo): boolean {
  return typeof info.entitlements.active['pro'] !== 'undefined';
}

/**
 * Returns the current Pro status as a reactive boolean.
 * - Initialises from MMKV cache (synchronous, no flicker).
 * - Fires a RevenueCat getCustomerInfo() on mount to sync; if it fails,
 *   the cached value is kept.
 * - Subscribes to CustomerInfo updates so a completed purchase is reflected
 *   immediately without re-mounting. Purchase updates set
 *   purchasedThisSession so any in-flight launch-time check cannot overwrite.
 */
export function useProStatus(): boolean {
  const [isPro, setIsProState] = useState(loadIsPro());
  const purchasedThisSession = useRef(false);

  useEffect(() => {
    let mounted = true;

    Purchases.getCustomerInfo()
      .then(info => {
        if (!mounted || purchasedThisSession.current) return;
        const active = isProFromInfo(info);
        setIsPro(active);
        setIsProState(active);
      })
      .catch(() => { /* keep cached value */ });

    const listener = Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
      if (!mounted) return;
      const active = isProFromInfo(info);
      if (active) purchasedThisSession.current = true;
      setIsPro(active);
      setIsProState(active);
    });

    return () => {
      mounted = false;
      listener.remove();
    };
  }, []);

  return isPro;
}
```

- [ ] **Step 2: Create `src/utils/proGate.ts`**

```ts
// src/utils/proGate.ts
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

/**
 * If isPro is false, navigates to the PaywallScreen and returns false.
 * Otherwise returns true so the caller can proceed with the Pro action.
 */
export function requirePro(
  isPro: boolean,
  navigation: NavigationProp<RootStackParamList>,
): boolean {
  if (!isPro) {
    navigation.navigate('Paywall');
    return false;
  }
  return true;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useProStatus.ts src/utils/proGate.ts
git commit -m "feat: add useProStatus hook and requirePro gate helper"
```

---

## Chunk 2: Pure Logic Utilities (TDD)

### Task 5: Stats computation

**Files:**
- Create: `src/utils/stats.ts`
- Create: `__tests__/stats.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/stats.test.ts
import { computeStats } from '../src/utils/stats';
import { Game } from '../src/types';

const mkGame = (overrides: Partial<Game> = {}): Game => ({
  id: 'g1', date: 1000, status: 'finished', players: [], ...overrides,
});

const mkPlayer = (name: string, totalIn: number, finalChips: number) => ({
  id: name,
  name,
  finalChips,
  transactions: [{ id: 't1', type: 'buyin' as const, amount: totalIn, timestamp: 0 }],
});

describe('computeStats', () => {
  it('returns empty array for no finished games', () => {
    expect(computeStats([])).toEqual([]);
  });

  it('ignores active games', () => {
    const game = mkGame({ status: 'active', players: [mkPlayer('Dan', 100, 150)] });
    expect(computeStats([game])).toEqual([]);
  });

  it('computes net for a single finished game', () => {
    const game = mkGame({ players: [mkPlayer('Dan', 100, 145), mkPlayer('Maya', 100, 55)] });
    const stats = computeStats([game]);
    expect(stats).toHaveLength(2);
    const dan = stats.find(s => s.name === 'Dan')!;
    expect(dan.totalNet).toBe(45);
    expect(dan.gamesPlayed).toBe(1);
    expect(dan.biggestWin).toBe(45);
  });

  it('aggregates the same player across multiple games (case-insensitive)', () => {
    const g1 = mkGame({ id: 'g1', players: [mkPlayer('Dan', 100, 150)] });
    const g2 = mkGame({ id: 'g2', players: [mkPlayer('dan', 100, 80)] });
    const stats = computeStats([g1, g2]);
    expect(stats).toHaveLength(1);
    expect(stats[0].gamesPlayed).toBe(2);
    expect(stats[0].totalNet).toBe(30); // +50 -20
    // display name comes from first occurrence
    expect(stats[0].name).toBe('Dan');
  });

  it('biggestWin is 0 for a player who never won', () => {
    const game = mkGame({ players: [mkPlayer('Loser', 100, 50)] });
    const stats = computeStats([game]);
    expect(stats[0].biggestWin).toBe(0);
  });

  it('biggestWin is max single-game win across multiple games', () => {
    const g1 = mkGame({ id: 'g1', players: [mkPlayer('Dan', 100, 150)] }); // +50
    const g2 = mkGame({ id: 'g2', players: [mkPlayer('Dan', 100, 130)] }); // +30
    const stats = computeStats([g1, g2]);
    expect(stats[0].biggestWin).toBe(50);
  });

  it('sorts by totalNet descending', () => {
    const game = mkGame({
      players: [mkPlayer('Low', 100, 80), mkPlayer('High', 100, 160)],
    });
    const stats = computeStats([game]);
    expect(stats[0].name).toBe('High');
    expect(stats[1].name).toBe('Low');
  });

  it('handles cashed-out players (no finalChips)', () => {
    const player = {
      id: 'p1', name: 'Early', finalChips: undefined,
      transactions: [
        { id: 't1', type: 'buyin' as const, amount: 100, timestamp: 0 },
        { id: 't2', type: 'cashout' as const, amount: 120, timestamp: 1 },
      ],
    };
    const game = mkGame({ players: [player] });
    const stats = computeStats([game]);
    expect(stats[0].totalNet).toBe(20);
  });
});
```

- [ ] **Step 2: Run — expect failures**

```bash
npx jest __tests__/stats.test.ts --no-coverage 2>&1 | tail -5
```

Expected: FAIL — `Cannot find module '../src/utils/stats'`

- [ ] **Step 3: Implement `src/utils/stats.ts`**

```ts
// src/utils/stats.ts
import { Game } from '../types';

export interface PlayerStat {
  name: string;
  gamesPlayed: number;
  totalNet: number;
  biggestWin: number; // 0 if never positive
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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

      const finalValue = player.finalChips ?? cashedOut;
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
```

- [ ] **Step 4: Run — expect pass**

```bash
npx jest __tests__/stats.test.ts --no-coverage 2>&1 | tail -5
```

Expected: All 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/stats.ts __tests__/stats.test.ts
git commit -m "feat: add computeStats utility with tests"
```

---

### Task 6: CSV export utility

**Files:**
- Create: `src/utils/csvExport.ts`
- Create: `__tests__/csvExport.test.ts`
- Dependency (read-only): `src/settlement.ts` — exports `computeNets` and `computeTransfers`

- [ ] **Step 0: Verify settlement module exports exist**

```bash
grep "export function computeNets\|export function computeTransfers" src/settlement.ts
```

Expected: both lines present. If not, stop and report BLOCKED.

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/csvExport.test.ts
import { generateSingleGameCSV, generateAllGamesCSV } from '../src/utils/csvExport';
import { Game } from '../src/types';

const baseGame: Game = {
  id: 'g1',
  date: new Date('2026-04-07').getTime(),
  status: 'finished',
  name: 'Friday Night',
  players: [
    {
      id: 'p1', name: 'Dan', finalChips: 145,
      transactions: [{ id: 't1', type: 'buyin', amount: 100, timestamp: 0 }],
    },
    {
      id: 'p2', name: 'Maya', finalChips: 55,
      transactions: [{ id: 't2', type: 'buyin', amount: 100, timestamp: 0 }],
    },
  ],
};

describe('generateSingleGameCSV', () => {
  it('includes header row', () => {
    const csv = generateSingleGameCSV(baseGame);
    expect(csv).toContain('Game,Date,Player,Total In,Cash Out / Final Chips,Net');
  });

  it('uses game name in Game column', () => {
    const csv = generateSingleGameCSV(baseGame);
    expect(csv).toContain('Friday Night,2026-04-07,Dan');
  });

  it('falls back to "Unnamed Game" when name is undefined', () => {
    const game = { ...baseGame, name: undefined };
    const csv = generateSingleGameCSV(game);
    expect(csv).toContain('Unnamed Game,');
  });

  it('formats positive net with + prefix', () => {
    const csv = generateSingleGameCSV(baseGame);
    expect(csv).toContain('+45.00');
  });

  it('formats negative net with - prefix', () => {
    const csv = generateSingleGameCSV(baseGame);
    expect(csv).toContain('-45.00');
  });

  it('includes Transfers section', () => {
    const csv = generateSingleGameCSV(baseGame);
    expect(csv).toContain('Transfers');
    expect(csv).toContain('From,To,Amount');
    expect(csv).toContain('Maya,Dan,45.00');
  });
});

describe('generateAllGamesCSV', () => {
  it('skips active games', () => {
    const activeGame: Game = { ...baseGame, id: 'g2', status: 'active', name: 'Active' };
    const csv = generateAllGamesCSV([activeGame]);
    expect(csv).not.toContain('Active');
  });

  it('includes multiple games separated by blank line', () => {
    const game2: Game = {
      ...baseGame,
      id: 'g2',
      name: 'Saturday',
      date: new Date('2026-04-05').getTime(),
    };
    const csv = generateAllGamesCSV([baseGame, game2]);
    expect(csv).toContain('Friday Night');
    expect(csv).toContain('Saturday');
    expect(csv).toContain('\n\n');
  });

  it('does not include Transfers section', () => {
    const csv = generateAllGamesCSV([baseGame]);
    expect(csv).not.toContain('Transfers');
  });
});
```

- [ ] **Step 2: Run — expect failures**

```bash
npx jest __tests__/csvExport.test.ts --no-coverage 2>&1 | tail -5
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/utils/csvExport.ts`**

```ts
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
```

- [ ] **Step 4: Run — expect pass**

```bash
npx jest __tests__/csvExport.test.ts --no-coverage 2>&1 | tail -5
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/csvExport.ts __tests__/csvExport.test.ts
git commit -m "feat: add CSV export utility with tests"
```

---

### Task 7: Backup validation utility

**Files:**
- Create: `src/utils/backup.ts`
- Create: `__tests__/backup.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/backup.test.ts
import { validateBackup, serializeBackup } from '../src/utils/backup';

const validGames = [
  { id: 'g1', status: 'finished', players: [], date: 1000 },
];

describe('validateBackup', () => {
  it('throws on invalid JSON', () => {
    expect(() => validateBackup('not json')).toThrow('Invalid JSON');
  });

  it('throws when games array is missing', () => {
    expect(() => validateBackup('{}')).toThrow('"games" array');
  });

  it('throws when a game object is malformed — missing id', () => {
    const bad = JSON.stringify({ games: [{ status: 'finished', players: [], date: 1 }] });
    expect(() => validateBackup(bad)).toThrow('"id"');
  });

  it('throws when a game has invalid status', () => {
    const bad = JSON.stringify({ games: [{ id: 'g1', status: 'unknown', players: [], date: 1 }] });
    expect(() => validateBackup(bad)).toThrow('"status"');
  });

  it('throws when a game is missing players', () => {
    const bad = JSON.stringify({ games: [{ id: 'g1', status: 'finished', date: 1 }] });
    expect(() => validateBackup(bad)).toThrow('"players"');
  });

  it('throws when a game is missing date', () => {
    const bad = JSON.stringify({ games: [{ id: 'g1', status: 'finished', players: [] }] });
    expect(() => validateBackup(bad)).toThrow('"date"');
  });

  it('returns games and empty contacts when contacts absent', () => {
    const result = validateBackup(JSON.stringify({ games: validGames }));
    expect(result.games).toHaveLength(1);
    expect(result.contacts).toEqual([]);
  });

  it('returns contacts when present', () => {
    const contacts = [{ id: 'c1', name: 'Dan' }];
    const result = validateBackup(JSON.stringify({ games: validGames, contacts }));
    expect(result.contacts).toEqual(contacts);
  });

  it('ignores unknown top-level keys including isPro', () => {
    const data = JSON.stringify({ games: validGames, isPro: true, extra: 'ignored' });
    expect(() => validateBackup(data)).not.toThrow();
  });
});

describe('serializeBackup', () => {
  it('produces valid JSON with games and contacts', () => {
    const json = serializeBackup(validGames as any, []);
    const parsed = JSON.parse(json);
    expect(parsed.games).toHaveLength(1);
    expect(parsed.contacts).toEqual([]);
  });

  it('does not include isPro', () => {
    const json = serializeBackup(validGames as any, []);
    expect(json).not.toContain('isPro');
  });
});
```

- [ ] **Step 2: Run — expect failures**

```bash
npx jest __tests__/backup.test.ts --no-coverage 2>&1 | tail -5
```

- [ ] **Step 3: Implement `src/utils/backup.ts`**

```ts
// src/utils/backup.ts
import { Game, Contact } from '../types';

export interface BackupData {
  games: Game[];
  contacts: Contact[];
}

export function serializeBackup(games: Game[], contacts: Contact[]): string {
  return JSON.stringify({ games, contacts }, null, 2);
}

export function validateBackup(raw: string): BackupData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Expected a JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.games)) {
    throw new Error('Missing required "games" array');
  }

  for (const item of obj.games as unknown[]) {
    if (typeof item !== 'object' || item === null) {
      throw new Error('Each game must be an object');
    }
    const g = item as Record<string, unknown>;
    if (typeof g.id !== 'string') throw new Error('Game missing "id"');
    if (g.status !== 'active' && g.status !== 'finished') {
      throw new Error('Game has invalid "status"');
    }
    if (!Array.isArray(g.players)) throw new Error('Game missing "players"');
    if (typeof g.date !== 'number') throw new Error('Game missing "date"');
  }

  const contacts = Array.isArray(obj.contacts) ? (obj.contacts as Contact[]) : [];

  return { games: obj.games as Game[], contacts };
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npx jest __tests__/backup.test.ts --no-coverage 2>&1 | tail -5
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/backup.ts __tests__/backup.test.ts
git commit -m "feat: add backup validation utility with tests"
```

---

### Task 8: WhatsApp URL builder

**Files:**
- Create: `src/utils/whatsapp.ts`
- Create: `__tests__/whatsapp.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/whatsapp.test.ts
import { buildSummaryURL, buildTransferURL } from '../src/utils/whatsapp';
import { Transfer } from '../src/types';

describe('buildSummaryURL', () => {
  it('starts with whatsapp://send?text=', () => {
    const url = buildSummaryURL([], 100);
    expect(url).toMatch(/^whatsapp:\/\/send\?text=/);
  });

  it('includes break-even message when no transfers', () => {
    const url = decodeURIComponent(buildSummaryURL([], 100));
    expect(url).toContain('everyone broke even');
    expect(url).toContain('$100.00');
  });

  it('uses em-dash (not hyphen) in break-even line', () => {
    const url = decodeURIComponent(buildSummaryURL([], 100));
    expect(url).toContain('—'); // em-dash U+2014
  });

  it('includes total pot in summary URL', () => {
    const url = decodeURIComponent(buildSummaryURL([], 280));
    expect(url).toContain('$280.00');
  });

  it('includes transfer lines when transfers exist', () => {
    const transfers: Transfer[] = [{ from: 'Dan', to: 'Maya', amount: 45 }];
    const url = decodeURIComponent(buildSummaryURL(transfers, 200));
    expect(url).toContain('Dan → Maya: $45.00');
    expect(url).toContain('$200.00');
  });
});

describe('buildTransferURL', () => {
  it('starts with whatsapp://send?phone= scheme', () => {
    const url = buildTransferURL('+972501234567', 'Dan', 'Maya', 45);
    expect(url).toMatch(/^whatsapp:\/\/send\?phone=/);
  });

  it('includes phone in URL', () => {
    const url = buildTransferURL('+972501234567', 'Dan', 'Maya', 45);
    expect(url).toContain('phone=%2B972501234567');
  });

  it('includes personalised message', () => {
    const url = decodeURIComponent(buildTransferURL('+972501234567', 'Dan', 'Maya', 45));
    expect(url).toContain('Dan');
    expect(url).toContain('Maya');
    expect(url).toContain('$45.00');
  });
});
```

- [ ] **Step 2: Run — expect failures**

```bash
npx jest __tests__/whatsapp.test.ts --no-coverage 2>&1 | tail -5
```

- [ ] **Step 3: Implement `src/utils/whatsapp.ts`**

```ts
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
```

- [ ] **Step 4: Run — expect pass**

```bash
npx jest __tests__/whatsapp.test.ts --no-coverage 2>&1 | tail -5
```

Expected: All tests pass.

- [ ] **Step 5: Run full test suite to confirm nothing broken**

```bash
npx jest --no-coverage 2>&1 | tail -10
```

Expected: All test suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/utils/whatsapp.ts __tests__/whatsapp.test.ts
git commit -m "feat: add WhatsApp URL builder utility with tests"
```

---

## Chunk 3: New Screens

### Task 9: PaywallScreen

**Files:**
- Create: `src/screens/PaywallScreen.tsx`

- [ ] **Step 1: Create `src/screens/PaywallScreen.tsx`**

```tsx
// src/screens/PaywallScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
  ScrollView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { RootStackParamList } from '../types';
import { setIsPro } from '../storage';

type Props = StackScreenProps<RootStackParamList, 'Paywall'>;

const FEATURES = [
  'Unlimited games',
  'Save player contacts',
  'WhatsApp integration',
  'All-time player stats',
  'CSV export',
  'Backup & restore',
];

export default function PaywallScreen({ navigation }: Props) {
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [loadingOffering, setLoadingOffering] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Purchases.getOfferings()
      .then(o => setPkg(
        o.all['default']?.availablePackages[0] ?? o.current?.availablePackages[0] ?? null,
      ))
      .catch(() => {})
      .finally(() => setLoadingOffering(false));
  }, []);

  async function handlePurchase() {
    if (!pkg) return;
    setBusy(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const active = typeof customerInfo.entitlements.active['pro'] !== 'undefined';
      if (active) {
        setIsPro(true);
        navigation.goBack();
      }
    } catch (e: any) {
      if (!e.userCancelled) Alert.alert('Purchase failed', e.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    setBusy(true);
    try {
      const info = await Purchases.restorePurchases();
      const active = typeof info.entitlements.active['pro'] !== 'undefined';
      setIsPro(active);
      if (active) {
        Alert.alert('Restored!', 'Pro features are now unlocked.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Nothing to restore', 'No previous Pro purchase found for this account.');
      }
    } catch (e: any) {
      Alert.alert('Restore failed', e.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Unlock PokerSplitter Pro</Text>
        <Text style={styles.subtitle}>One-time purchase · No subscription</Text>
        {FEATURES.map(f => (
          <View key={f} style={styles.featureRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
        {loadingOffering ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#1a73e8" />
        ) : (
          <>
            <TouchableOpacity
              style={[styles.buyBtn, busy && styles.disabled]}
              onPress={handlePurchase}
              disabled={busy}
            >
              <Text style={styles.buyBtnText}>
                {busy ? 'Processing…' : 'Unlock Pro — $2.99'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRestore} disabled={busy}>
              <Text style={styles.restoreText}>Restore Purchase</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 8 },
  closeBtnText: { fontSize: 20, color: '#666' },
  content: { padding: 28, paddingTop: 56, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#111', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#999', marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignSelf: 'stretch', marginBottom: 14 },
  check: { color: '#1a73e8', fontSize: 16, fontWeight: '700', marginRight: 10 },
  featureText: { fontSize: 16, color: '#333', flex: 1 },
  buyBtn: {
    marginTop: 36, backgroundColor: '#1a73e8', borderRadius: 12,
    padding: 16, alignItems: 'center', alignSelf: 'stretch',
  },
  disabled: { opacity: 0.5 },
  buyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  restoreText: { marginTop: 16, color: '#888', fontSize: 14 },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/PaywallScreen.tsx
git commit -m "feat: add PaywallScreen with RevenueCat purchase and restore"
```

---

### Task 10: ContactsScreen

**Files:**
- Create: `src/screens/ContactsScreen.tsx`

- [ ] **Step 1: Create `src/screens/ContactsScreen.tsx`**

```tsx
// src/screens/ContactsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { v4 as uuidv4 } from 'uuid';
import { RootStackParamList, Contact } from '../types';
import { loadContacts, saveContact, updateContact, deleteContact } from '../storage';

type Props = StackScreenProps<RootStackParamList, 'Contacts'>;

const PHONE_REGEX = /^\+\d{7,15}$/;

function validatePhone(phone: string): string | null {
  if (!phone) return null; // optional
  if (!PHONE_REGEX.test(phone)) return 'Enter a valid phone number (e.g. +972501234567)';
  return null;
}

export default function ContactsScreen(_: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setContacts(loadContacts());
    }, []),
  );

  function openAdd() {
    setEditing(null);
    setName('');
    setPhone('');
    setPhoneError(null);
    setModalVisible(true);
  }

  function openEdit(c: Contact) {
    setEditing(c);
    setName(c.name);
    setPhone(c.phone ?? '');
    setPhoneError(null);
    setModalVisible(true);
  }

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required');
      return;
    }
    const err = validatePhone(phone.trim());
    if (err) {
      setPhoneError(err);
      return;
    }
    const contact: Contact = {
      id: editing?.id ?? uuidv4(),
      name: name.trim(),
      phone: phone.trim() || undefined,
    };
    if (editing) {
      updateContact(contact);
    } else {
      saveContact(contact);
    }
    setContacts(loadContacts());
    setModalVisible(false);
  }

  function handleDelete(id: string) {
    Alert.alert('Delete contact', 'Remove this contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          deleteContact(id);
          setContacts(loadContacts());
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        keyExtractor={c => c.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => openEdit(item)}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              {item.phone ? <Text style={styles.phone}>{item.phone}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No contacts saved yet.</Text>
        }
      />
      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Add Contact</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Contact' : 'New Contact'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Name *"
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <TextInput
              style={[styles.input, phoneError ? styles.inputError : null]}
              placeholder="Phone (e.g. +972501234567)"
              value={phone}
              onChangeText={v => { setPhone(v); setPhoneError(null); }}
              keyboardType="phone-pad"
            />
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, paddingBottom: 90 },
  row: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  name: { fontSize: 16, fontWeight: '600', color: '#111' },
  phone: { fontSize: 13, color: '#777', marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteText: { color: '#e53935', fontSize: 16 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  addBtn: {
    position: 'absolute', bottom: 24, left: 20, right: 20,
    backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#111' },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12,
    fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#ddd',
  },
  inputError: { borderColor: '#e53935' },
  errorText: { color: '#e53935', fontSize: 13, marginBottom: 8, marginTop: -8 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  cancelBtnText: { color: '#666', fontSize: 15 },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#1a73e8', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/ContactsScreen.tsx
git commit -m "feat: add ContactsScreen with add/edit/delete and phone validation"
```

---

### Task 11: ContactPickerModal

**Files:**
- Create: `src/components/ContactPickerModal.tsx`

- [ ] **Step 1: Create `src/components/ContactPickerModal.tsx`**

```tsx
// src/components/ContactPickerModal.tsx
import React, { useState, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { Contact } from '../types';

interface Props {
  visible: boolean;
  contacts: Contact[];
  onSelect: (contact: Contact) => void;
  onCancel: () => void;
}

export default function ContactPickerModal({ visible, contacts, onSelect, onCancel }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(c => c.name.toLowerCase().includes(q));
  }, [query, contacts]);

  function handleClose() {
    setQuery('');
    onCancel();
  }

  function handleSelect(contact: Contact) {
    setQuery('');
    onSelect(contact);
  }

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Contact</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Search contacts…"
          value={query}
          onChangeText={setQuery}
          autoFocus
          clearButtonMode="while-editing"
        />
        {contacts.length === 0 ? (
          <Text style={styles.empty}>
            No contacts saved — add them in Settings.
          </Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={c => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
                <Text style={styles.name}>{item.name}</Text>
                {item.phone ? <Text style={styles.phone}>{item.phone}</Text> : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No matches.</Text>}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  closeBtn: { padding: 4 },
  closeBtnText: { color: '#1a73e8', fontSize: 16 },
  search: {
    margin: 12, backgroundColor: '#fff', borderRadius: 10, padding: 12,
    fontSize: 15, borderWidth: 1, borderColor: '#ddd',
  },
  row: {
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8,
    borderRadius: 10, padding: 14, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3,
  },
  name: { fontSize: 16, fontWeight: '600', color: '#111' },
  phone: { fontSize: 13, color: '#777', marginTop: 2 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15, padding: 20 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ContactPickerModal.tsx
git commit -m "feat: add ContactPickerModal component"
```

---

### Task 12: StatsScreen

**Files:**
- Create: `src/screens/StatsScreen.tsx`

- [ ] **Step 1: Create `src/screens/StatsScreen.tsx`**

```tsx
// src/screens/StatsScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { loadGames } from '../storage';
import { computeStats, PlayerStat } from '../utils/stats';

type Props = StackScreenProps<RootStackParamList, 'Stats'>;

function formatNet(n: number): string {
  if (n > 0) return `+$${n.toFixed(2)}`;
  if (n < 0) return `-$${Math.abs(n).toFixed(2)}`;
  return '$0.00';
}

export default function StatsScreen(_: Props) {
  const [stats, setStats] = useState<PlayerStat[]>([]);

  useFocusEffect(
    useCallback(() => {
      setStats(computeStats(loadGames()));
    }, []),
  );

  return (
    <View style={styles.container}>
      <View style={styles.tableHeader}>
        <Text style={[styles.col, styles.colName]}>Player</Text>
        <Text style={styles.col}>Games</Text>
        <Text style={styles.col}>Total</Text>
        <Text style={styles.col}>Best Win</Text>
      </View>
      <FlatList
        data={stats}
        keyExtractor={s => s.name}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={[styles.col, styles.colName]} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.col}>{item.gamesPlayed}</Text>
            <Text style={[styles.col, item.totalNet >= 0 ? styles.green : styles.red]}>
              {formatNet(item.totalNet)}
            </Text>
            <Text style={styles.col}>${item.biggestWin.toFixed(2)}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No finished games yet — stats appear after your first settled game.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { paddingBottom: 40 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#ebebeb',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  row: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: '#f0f0f0',
  },
  col: { flex: 1, fontSize: 14, color: '#333', textAlign: 'right' },
  colName: { flex: 2, textAlign: 'left', fontWeight: '600' },
  green: { color: '#2e7d32', fontWeight: '600' },
  red: { color: '#c62828', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#999', padding: 32, fontSize: 14 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/StatsScreen.tsx
git commit -m "feat: add StatsScreen with all-time leaderboard"
```

---

### Task 13: SettingsScreen

**Files:**
- Create: `src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Create `src/screens/SettingsScreen.tsx`**

```tsx
// src/screens/SettingsScreen.tsx
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import {
  loadGames, loadContacts, restoreBackup,
} from '../storage';
import { serializeBackup, validateBackup } from '../utils/backup';
import { generateAllGamesCSV } from '../utils/csvExport';
import { useProStatus } from '../hooks/useProStatus';
import { requirePro } from '../utils/proGate';
import Constants from 'expo-constants';

type Props = StackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const isPro = useProStatus();

  async function handleExportAll() {
    if (!requirePro(isPro, navigation)) return;
    const csv = generateAllGamesCSV(loadGames());
    const path = `${FileSystem.cacheDirectory}pokersplitter-games.csv`;
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path);
  }

  async function handleBackup() {
    if (!requirePro(isPro, navigation)) return;
    const json = serializeBackup(loadGames(), loadContacts());
    const date = new Date().toISOString().slice(0, 10);
    const path = `${FileSystem.cacheDirectory}pokersplitter-backup-${date}.json`;
    await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path);
  }

  async function handleRestore() {
    if (!requirePro(isPro, navigation)) return;

    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (result.canceled) return;

    const asset = result.assets[0];
    let raw: string;
    try {
      raw = await FileSystem.readAsStringAsync(asset.uri);
    } catch {
      Alert.alert('Error', 'Could not read the file.');
      return;
    }

    let backup;
    try {
      backup = validateBackup(raw);
    } catch (e: any) {
      Alert.alert('Invalid backup', e.message ?? 'File could not be validated.');
      return;
    }

    const games = loadGames();
    const hasActive = games.some(g => g.status === 'active');
    const msg = hasActive
      ? 'You have a game in progress. Restoring will discard it. Continue?'
      : 'This will replace all current data. Continue?';

    Alert.alert('Restore backup', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore', style: 'destructive',
        onPress: () => {
          restoreBackup(backup.games, backup.contacts);
          Alert.alert('Restored', 'Data has been restored successfully.');
          navigation.navigate('Home');
        },
      },
    ]);
  }

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isPro ? (
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>⭐ Pro</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('Paywall')}>
          <Text style={styles.upgradeBtnText}>Unlock Pro — $2.99</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Data</Text>
      <TouchableOpacity style={styles.row} onPress={() => { if (!requirePro(isPro, navigation)) return; navigation.navigate('Contacts'); }}>
        <Text style={styles.rowText}>Manage Contacts {!isPro && '🔒'}</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={handleExportAll}>
        <Text style={styles.rowText}>Export All Games (CSV) {!isPro && '🔒'}</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={handleBackup}>
        <Text style={styles.rowText}>Backup Data {!isPro && '🔒'}</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={handleRestore}>
        <Text style={styles.rowText}>Restore Data {!isPro && '🔒'}</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <Text style={styles.version}>PokerSplitter v{version}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  proBadge: {
    backgroundColor: '#fff3e0', borderRadius: 10, padding: 14,
    alignItems: 'center', marginBottom: 20,
  },
  proBadgeText: { fontSize: 16, fontWeight: '700', color: '#e65100' },
  upgradeBtn: {
    backgroundColor: '#1a73e8', borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 20,
  },
  upgradeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 12, color: '#999', marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3,
  },
  rowText: { fontSize: 15, color: '#111' },
  chevron: { fontSize: 20, color: '#ccc' },
  version: { textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 32 },
});
```

- [ ] **Step 2: Add `restoreBackup` to `src/storage.ts`**

Append to `src/storage.ts`:

```ts
export function restoreBackup(games: Game[], contacts: Contact[]): void {
  storage.set(GAMES_KEY, JSON.stringify(games));
  storage.set(CONTACTS_KEY, JSON.stringify(contacts));
}
```

- [ ] **Step 3: Install `expo-constants` if not already present**

```bash
npx expo install expo-constants
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 5: Commit**

```bash
git add src/screens/SettingsScreen.tsx src/storage.ts
git commit -m "feat: add SettingsScreen with backup/restore/export and Pro badge"
```

---

## Chunk 4: Modified Screens

### Task 14: HomeScreen updates

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Replace `src/screens/HomeScreen.tsx`**

```tsx
// src/screens/HomeScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game } from '../types';
import { loadGames } from '../storage';
import { useProStatus } from '../hooks/useProStatus';
import { requirePro } from '../utils/proGate';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

const FREE_GAME_LIMIT = 3;

export default function HomeScreen({ navigation }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const isPro = useProStatus();

  useFocusEffect(
    useCallback(() => {
      const all = loadGames().sort((a, b) => b.date - a.date);
      setGames(all);
    }, []),
  );

  function handleNewGame() {
    if (!isPro && games.length >= FREE_GAME_LIMIT) {
      navigation.navigate('Paywall');
      return;
    }
    navigation.navigate('GameSetup');
  }

  function handleGamePress(game: Game) {
    if (game.status === 'active') {
      navigation.navigate('ActiveGame', { gameId: game.id });
    } else {
      navigation.navigate('GameDetail', { gameId: game.id });
    }
  }

  function gameCountIndicator(): string | null {
    if (isPro || games.length > FREE_GAME_LIMIT) return null;
    if (games.length === FREE_GAME_LIMIT) return `${FREE_GAME_LIMIT}/${FREE_GAME_LIMIT} games used — upgrade to add more`;
    return `${games.length}/${FREE_GAME_LIMIT} games used`;
  }

  const indicator = gameCountIndicator();

  function renderItem({ item }: ListRenderItemInfo<Game>) {
    const date = item.name ?? new Date(item.date).toLocaleDateString();
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
      {indicator ? <Text style={styles.indicator}>{indicator}</Text> : null}
      <FlatList
        data={games}
        keyExtractor={g => g.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No games yet. Start one!</Text>}
      />
      <TouchableOpacity style={styles.fab} onPress={handleNewGame}>
        <Text style={styles.fabText}>+ New Game</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  indicator: {
    textAlign: 'center', fontSize: 12, color: '#e65100',
    paddingVertical: 8, backgroundColor: '#fff3e0',
  },
  list: { padding: 16, paddingBottom: 80 },
  row: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  activeRow: { borderWidth: 1.5, borderColor: '#4CAF50' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  rowMeta: { fontSize: 13, color: '#777', marginTop: 2 },
  chevron: { fontSize: 22, color: '#ccc' },
  activeChevron: { color: '#4CAF50' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 24, left: 20, right: 20,
    backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 2: Add Stats + Settings header buttons in `App.tsx`**

(Will be done in Task 18 when all screens are registered. Skip for now — HomeScreen compiles without them.)

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: update HomeScreen — game limit gate, count indicator, game name in row title"
```

---

### Task 15: GameSetupScreen updates

**Files:**
- Modify: `src/screens/GameSetupScreen.tsx`

- [ ] **Step 1: Replace `src/screens/GameSetupScreen.tsx`**

```tsx
// src/screens/GameSetupScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Game, Player, Transaction, Contact } from '../types';
import { saveGame, loadContacts } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import { useProStatus } from '../hooks/useProStatus';
import { requirePro } from '../utils/proGate';
import ContactPickerModal from '../components/ContactPickerModal';

type Props = StackScreenProps<RootStackParamList, 'GameSetup'>;

interface PlayerEntry {
  id: string;
  name: string;
  buyIn: string;
  phone?: string; // from linked contact
}

const newEntry = (): PlayerEntry => ({ id: uuidv4(), name: '', buyIn: '' });

export default function GameSetupScreen({ navigation }: Props) {
  const isPro = useProStatus();
  const [gameName, setGameName] = useState('');
  const [players, setPlayers] = useState<PlayerEntry[]>([newEntry(), newEntry()]);
  const [pickerForIndex, setPickerForIndex] = useState<number | null>(null);

  const contacts = loadContacts();

  function addPlayer() {
    setPlayers(prev => [...prev, newEntry()]);
  }

  function updatePlayer(index: number, field: keyof Omit<PlayerEntry, 'id'>, value: string) {
    setPlayers(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function removePlayer(index: number) {
    setPlayers(prev => prev.filter((_, i) => i !== index));
  }

  function handleContactPick(index: number) {
    if (!requirePro(isPro, navigation)) return;
    setPickerForIndex(index);
  }

  function handleContactSelected(contact: Contact) {
    if (pickerForIndex !== null) {
      setPlayers(prev => prev.map((p, i) =>
        i === pickerForIndex ? { ...p, name: contact.name, phone: contact.phone } : p,
      ));
    }
    setPickerForIndex(null);
  }

  function startGame() {
    if (players.length < 2) { Alert.alert('Need at least 2 players'); return; }
    for (const p of players) {
      if (!p.name.trim()) { Alert.alert('All players need a name'); return; }
      const amount = parseFloat(p.buyIn);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('All buy-in amounts must be positive numbers'); return;
      }
    }
    const names = players.map(p => p.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      Alert.alert('Duplicate names', 'All players must have unique names'); return;
    }

    const gamePlayers: Player[] = players.map(p => {
      const buyInTx: Transaction = { id: uuidv4(), type: 'buyin', amount: parseFloat(p.buyIn), timestamp: Date.now() };
      return { id: uuidv4(), name: p.name.trim(), transactions: [buyInTx], phone: p.phone };
    });

    const game: Game = {
      id: uuidv4(),
      date: Date.now(),
      status: 'active',
      players: gamePlayers,
      name: isPro && gameName.trim() ? gameName.trim() : undefined,
    };

    saveGame(game);
    navigation.replace('ActiveGame', { gameId: game.id });
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={players}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          isPro ? (
            <TextInput
              style={styles.gameNameInput}
              placeholder="Game name (optional)"
              value={gameName}
              onChangeText={setGameName}
            />
          ) : null
        }
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
            <TouchableOpacity onPress={() => handleContactPick(index)} style={styles.contactBtn}>
              <Text style={styles.contactBtnText}>👤</Text>
            </TouchableOpacity>
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

      <ContactPickerModal
        visible={pickerForIndex !== null}
        contacts={contacts}
        onSelect={handleContactSelected}
        onCancel={() => setPickerForIndex(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, paddingBottom: 100 },
  gameNameInput: {
    backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 15,
    borderWidth: 1, borderColor: '#ddd', marginBottom: 12,
  },
  playerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd' },
  nameInput: { flex: 1, marginRight: 8 },
  amountInput: { width: 90, marginRight: 4 },
  contactBtn: { padding: 8, marginRight: 4 },
  contactBtnText: { fontSize: 18 },
  removeBtn: { padding: 8 },
  removeText: { color: '#e53935', fontSize: 16 },
  addBtn: {
    alignItems: 'center', padding: 14, borderWidth: 1.5, borderColor: '#1a73e8',
    borderRadius: 10, borderStyle: 'dashed', marginTop: 4,
  },
  addBtnText: { color: '#1a73e8', fontSize: 15, fontWeight: '600' },
  startBtn: {
    position: 'absolute', bottom: 24, left: 20, right: 20,
    backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/GameSetupScreen.tsx
git commit -m "feat: update GameSetupScreen — game name (Pro), contact picker (Pro)"
```

---

### Task 16: SettlementScreen updates (WhatsApp section)

**Files:**
- Modify: `src/screens/SettlementScreen.tsx`

- [ ] **Step 1: Replace `src/screens/SettlementScreen.tsx`**

```tsx
// src/screens/SettlementScreen.tsx
import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Share,
  Linking, Alert, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Transfer } from '../types';
import { loadGames, updateGame } from '../storage';
import { computeNets, computeTransfers } from '../settlement';
import TransferRow from '../components/TransferRow';
import { useProStatus } from '../hooks/useProStatus';
import { buildSummaryURL, buildTransferURL } from '../utils/whatsapp';

type Props = StackScreenProps<RootStackParamList, 'Settlement'>;

export default function SettlementScreen({ route, navigation }: Props) {
  const { gameId } = route.params;
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [pot, setPot] = useState(0);
  const [phoneByName, setPhoneByName] = useState<Record<string, string>>({});
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [whatsappAvailable, setWhatsappAvailable] = useState<boolean | null>(null);
  const isPro = useProStatus();

  useFocusEffect(
    useCallback(() => {
      const game = loadGames().find(g => g.id === gameId);
      if (!game) return;
      if (game.status !== 'finished') updateGame({ ...game, status: 'finished' });
      const totalPot = game.players.flatMap(p => p.transactions)
        .filter(t => t.type === 'buyin' || t.type === 'rebuy')
        .reduce((sum, t) => sum + t.amount, 0);
      const nets = computeNets(game.players);
      const result = computeTransfers(nets);
      // Build phone lookup from player data (set when a contact was picked)
      const phones: Record<string, string> = {};
      for (const p of game.players) {
        if (p.phone) phones[p.name] = p.phone;
      }
      setPot(totalPot);
      setTransfers(result);
      setPhoneByName(phones);
      navigation.setOptions({ headerLeft: () => null });
    }, [gameId, navigation]),
  );

  useEffect(() => {
    if (!isPro) return;
    Linking.canOpenURL('whatsapp://').then(setWhatsappAvailable).catch(() => setWhatsappAvailable(false));
  }, [isPro]);

  async function handleShare() {
    const lines = transfers.length === 0
      ? ['No transfers needed — everyone broke even!']
      : transfers.map(t => `${t.from} → ${t.to}: $${t.amount.toFixed(2)}`);
    const message = `Poker Settlement\n\n${lines.join('\n')}\n\nTotal pot: $${pot.toFixed(2)}`;
    await Share.share({ message });
  }

  async function handleShareWhatsApp() {
    const url = buildSummaryURL(transfers, pot);
    await Linking.openURL(url);
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
          <Text style={styles.header}>Total pot ${pot.toFixed(2)}</Text>
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

        {isPro && whatsappAvailable === true && (
          <>
            <TouchableOpacity style={styles.whatsappBtn} onPress={handleShareWhatsApp}>
              <Text style={styles.whatsappBtnText}>Share to WhatsApp</Text>
            </TouchableOpacity>
            {transfers.length > 0 && (
              <TouchableOpacity style={styles.whatsappBtn} onPress={() => setMessageModalVisible(true)}>
                <Text style={styles.whatsappBtnText}>Message Players</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        {isPro && whatsappAvailable === false && (
          <Text style={styles.noWhatsapp}>WhatsApp not installed</Text>
        )}

        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

      <MessagePlayersModal
        visible={messageModalVisible}
        transfers={transfers}
        phoneByName={phoneByName}
        onClose={() => setMessageModalVisible(false)}
      />
    </View>
  );
}

// ── Message Players Modal ────────────────────────────────────────────────────

interface ModalProps {
  visible: boolean;
  transfers: Transfer[];
  phoneByName: Record<string, string>; // player name → E.164 phone (from Player.phone)
  onClose: () => void;
}

function MessagePlayersModal({ visible, transfers, phoneByName, onClose }: ModalProps) {
  async function sendMessage(phone: string, from: string, to: string, amount: number) {
    const url = buildTransferURL(phone, from, to, amount);
    await Linking.openURL(url);
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={mStyles.container}>
        <View style={mStyles.header}>
          <Text style={mStyles.title}>Message Players</Text>
          <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}>
            <Text style={mStyles.closeBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={mStyles.list}>
          {transfers.map((t, i) => {
            const phone = phoneByName[t.from];
            return (
              <View key={i} style={mStyles.row}>
                <Text style={mStyles.transferText}>
                  {t.from} owes {t.to} ${t.amount.toFixed(2)}
                </Text>
                {phone ? (
                  <TouchableOpacity
                    style={mStyles.sendBtn}
                    onPress={() => sendMessage(phone, t.from, t.to, t.amount)}
                  >
                    <Text style={mStyles.sendBtnText}>Send on WhatsApp</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={mStyles.hint}>
                    Pick {t.from} from Contacts when starting a game to enable this
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee',
    paddingTop: 50,
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: { padding: 4 },
  closeBtnText: { color: '#1a73e8', fontSize: 16 },
  list: { padding: 16 },
  row: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 12,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3,
  },
  transferText: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 10 },
  sendBtn: { backgroundColor: '#25D366', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 4 },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hint: { fontSize: 13, color: '#999', fontStyle: 'italic' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, paddingBottom: 260 },
  header: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 16 },
  evenContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  evenText: { fontSize: 22, fontWeight: '700', color: '#2e7d32' },
  evenSub: { fontSize: 15, color: '#777', marginTop: 8 },
  footer: { position: 'absolute', bottom: 24, left: 20, right: 20, gap: 10 },
  shareBtn: { backgroundColor: '#2e7d32', borderRadius: 12, padding: 16, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  whatsappBtn: { backgroundColor: '#25D366', borderRadius: 12, padding: 14, alignItems: 'center' },
  whatsappBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  noWhatsapp: { textAlign: 'center', color: '#999', fontSize: 13 },
  doneBtn: { backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/SettlementScreen.tsx
git commit -m "feat: add WhatsApp section and Message Players modal to SettlementScreen"
```

---

### Task 17: GameDetailScreen updates

**Files:**
- Modify: `src/screens/GameDetailScreen.tsx`

- [ ] **Step 1: Add game name in header + Export CSV button**

Read the current `src/screens/GameDetailScreen.tsx` first, then add:

1. In `useFocusEffect`, after loading `game`, set the navigation title:
   ```ts
   navigation.setOptions({ title: game.name ?? new Date(game.date).toLocaleDateString() });
   ```

2. Add an Export CSV button below the existing content (Pro gated). Import `generateSingleGameCSV`, `FileSystem`, `Sharing`, `useProStatus`, `requirePro`:

   Add near other imports:
   ```ts
   import * as FileSystem from 'expo-file-system';
   import * as Sharing from 'expo-sharing';
   import { useProStatus } from '../hooks/useProStatus';
   import { requirePro } from '../utils/proGate';
   import { generateSingleGameCSV } from '../utils/csvExport';
   ```

   Add the export handler:
   ```ts
   const isPro = useProStatus();

   async function handleExport() {
     if (!requirePro(isPro, navigation)) return;
     const csv = generateSingleGameCSV(game!);
     const path = `${FileSystem.cacheDirectory}game-${gameId}.csv`;
     await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
     await Sharing.shareAsync(path);
   }
   ```

   Add export button JSX at the bottom of the screen (above closing `</View>`):
   ```tsx
   <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
     <Text style={styles.exportBtnText}>Export CSV {!isPro && '🔒'}</Text>
   </TouchableOpacity>
   ```

   Add to styles:
   ```ts
   exportBtn: {
     margin: 16, backgroundColor: '#f5f5f5', borderRadius: 10,
     padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ddd',
   },
   exportBtnText: { color: '#555', fontSize: 15 },
   ```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/GameDetailScreen.tsx
git commit -m "feat: show game name in GameDetailScreen header, add Pro CSV export"
```

---

## Chunk 5: Wiring + Final

### Task 18: App.tsx wiring

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Replace `App.tsx`**

```tsx
// App.tsx
import 'react-native-get-random-values';
import React from 'react';
import { Platform, TouchableOpacity, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { RootStackParamList } from './src/types';
import HomeScreen from './src/screens/HomeScreen';
import GameSetupScreen from './src/screens/GameSetupScreen';
import ActiveGameScreen from './src/screens/ActiveGameScreen';
import FinalChipCountScreen from './src/screens/FinalChipCountScreen';
import SettlementScreen from './src/screens/SettlementScreen';
import GameDetailScreen from './src/screens/GameDetailScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ContactsScreen from './src/screens/ContactsScreen';

// Configure RevenueCat at module scope — must run before any component mounts
// so that useProStatus()'s getCustomerInfo() call on first render is valid.
const _rcApiKey = Platform.OS === 'ios'
  ? process.env.EXPO_PUBLIC_RC_IOS_KEY ?? ''
  : process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? '';
if (_rcApiKey) {
  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  Purchases.configure({ apiKey: _rcApiKey });
}

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Home">
            <Stack.Screen name="Home" component={HomeScreen}
              options={({ navigation }) => ({
                title: 'PokerSplitter',
                headerRight: () => (
                  <React.Fragment>
                    <HeaderBtn label="Stats" onPress={() => navigation.navigate('Stats')} />
                    <HeaderBtn label="⚙" onPress={() => navigation.navigate('Settings')} />
                  </React.Fragment>
                ),
              })}
            />
            <Stack.Screen name="GameSetup" component={GameSetupScreen} options={{ title: 'New Game' }} />
            <Stack.Screen name="ActiveGame" component={ActiveGameScreen} options={{ title: 'Game' }} />
            <Stack.Screen name="FinalChipCount" component={FinalChipCountScreen} options={{ title: 'Chip Count' }} />
            <Stack.Screen name="Settlement" component={SettlementScreen} options={{ title: 'Settlement' }} />
            <Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ title: 'Game Detail' }} />
            <Stack.Screen name="Paywall" component={PaywallScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Stats" component={StatsScreen} options={{ title: 'All-Time Stats' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
            <Stack.Screen name="Contacts" component={ContactsScreen} options={{ title: 'Contacts' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function HeaderBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 10 }}>
      <Text style={{ color: '#1a73e8', fontSize: 15 }}>{label}</Text>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: wire all new screens in App.tsx, init RevenueCat, add header buttons"
```

---

### Task 19: Final test run + integration commit

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
npx jest --no-coverage 2>&1 | tail -15
```

Expected: All test suites pass (storage, settlement, stats, csvExport, backup, whatsapp).

- [ ] **Step 2: TypeScript full check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Run prebuild to verify native compile**

```bash
npx expo prebuild --clean 2>&1 | tail -10
```

Expected: iOS and Android native projects generated without errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: final integration pass — all tests pass, TypeScript clean"
```
