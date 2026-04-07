# PokerSplitter Pro — Design Spec

**Date:** 2026-04-07

## Overview

Add a freemium monetization layer and a set of Pro features to the existing PokerSplitter app. The free tier remains fully functional for up to 3 games. A one-time $2.99 "Pro" unlock removes the cap and adds player contacts, WhatsApp integration, statistics, CSV export, and backup/restore.

In-app purchases are handled via RevenueCat (`react-native-purchases`), which wraps Apple StoreKit and Google Play Billing. No backend required.

**Build requirement:** `react-native-purchases` is a native module and requires a custom dev client (`expo prebuild` + `expo run:ios` / `expo run:android`). Expo Go is not supported for this version of the app.

---

## Tech Stack additions

| Addition | Library |
|---|---|
| In-app purchases | `react-native-purchases` (RevenueCat) |
| File picker (restore) | `expo-document-picker` |
| File system (export/backup) | `expo-file-system` + native share sheet |

`app.json` must include:
- The RevenueCat Expo config plugin with iOS and Android API keys
- `expo-build-properties` for the native build
- `LSApplicationQueriesSchemes: ["whatsapp"]` under `expo.ios` so that `Linking.canOpenURL('whatsapp://send')` returns a meaningful result on iOS

---

## RevenueCat Configuration

| Key | Value |
|---|---|
| Entitlement ID | `"pro"` |
| Product ID | `"pokersplitter_pro_lifetime"` |
| Offering ID | `"default"` |

These identifiers must match exactly in both the RevenueCat dashboard and the app code. `useProStatus()` checks `customerInfo.entitlements.active["pro"]`.

**SDK initialization:** `Purchases.configure({ apiKey })` is called in `App.tsx`, before the `NavigationContainer` renders. The iOS and Android API keys are stored as Expo environment variables (`EXPO_PUBLIC_RC_IOS_KEY`, `EXPO_PUBLIC_RC_ANDROID_KEY`). Because `app.json` is static and does not resolve `process.env` at build time, the project must use `app.config.js` (dynamic config) to pass the keys to the RevenueCat config plugin. `App.tsx` reads the keys directly via `process.env.EXPO_PUBLIC_RC_IOS_KEY` / `process.env.EXPO_PUBLIC_RC_ANDROID_KEY`.

PaywallScreen is generic — it does not receive a navigation param indicating which feature triggered it. It always shows the same full feature list.

---

## Free vs Pro

**Free tier:**
- Full game flow (setup → active game → chip count → settlement → share)
- Up to 3 games at a time (gate check: `loadGames().length >= 3`)
- Deleted games free up a slot
- Game history for those games

**Pro ($2.99 one-time unlock):**
- Unlimited game creation
- Game naming
- Player contacts (name + optional phone number)
- Contact picker in Game Setup
- WhatsApp integration (share summary + individual transfer messages)
- Player statistics (all-time leaderboard)
- CSV export (single game or full history)
- Backup & restore (JSON file via share sheet / file picker)

---

## Data Model Changes

```ts
// Existing — add optional name field
interface Game {
  id: string;
  date: number;
  status: 'active' | 'finished';
  players: Player[];
  name?: string;           // NEW — optional game name e.g. "Friday Night"
}

// New — saved contacts
interface Contact {
  id: string;
  name: string;
  phone?: string;          // E.164 format e.g. "+972501234567"
}
```

The `Player` interface is unchanged. Phone numbers are never persisted on players — WhatsApp contact lookup at settlement time always comes from the saved Contacts store, matched by player name.

Duplicate player names within a single game are already prevented by GameSetupScreen validation (case-insensitive check before starting) and by `computeNets` which throws on duplicates. Stats aggregation and WhatsApp matching assume player names within a single game are unique.

**MMKV storage keys:**
- `"games"` — existing JSON array (Game gains optional `name`, backwards compatible)
- `"contacts"` — new JSON array of Contact objects
- `"isPro"` — boolean, local cache of RevenueCat entitlement

Stats are computed on the fly from finished games. Transfers are already computed on the fly. Neither is stored.

---

## Monetization & Paywall

### Purchase flow
1. User tries to create a game when already at the 3-game limit, OR taps a locked Pro feature
2. `PaywallScreen` is pushed onto the stack — lists Pro features, shows price
3. User taps "Unlock Pro — $2.99" → native Apple/Google payment sheet (RevenueCat)
4. On success: `isPro = true` written to MMKV, PaywallScreen pops back to the previous screen
5. User must re-tap the feature they originally wanted — there is no automatic action resumption
6. "Restore Purchase" button available for reinstalls

### Pro status verification
- RevenueCat SDK is initialized in `App.tsx` before navigation renders
- On every app launch: call RevenueCat `getCustomerInfo()`, update `isPro` in MMKV to match the entitlement result — this can set `isPro` to `false` if the entitlement is no longer active (e.g. after a refund)
- If `getCustomerInfo()` throws any error (network or otherwise), fall back to the cached MMKV value — same behaviour as offline
- Purchase callback result always wins: if a purchase completes while a launch-time `getCustomerInfo()` is still in-flight, the purchase sets `isPro = true` and the in-flight result is ignored for the current session
- Local MMKV cache used for offline use between launches
- RevenueCat dashboard provides revenue analytics

### Gate enforcement
- `useProStatus()` hook reads MMKV `isPro` value reactively
- Any component needing Pro calls `requirePro(navigation)` before acting: if not Pro, navigates to PaywallScreen and returns early
- `requirePro` does not pass any params to PaywallScreen

---

## New Screens

### PaywallScreen
- Header: "Unlock PokerSplitter Pro"
- Generic feature list with icons (unlimited games, contacts, WhatsApp, stats, export, backup)
- "Unlock Pro — $2.99" primary button
- "Restore Purchase" secondary button
- Dismiss button (X) in header — pops screen

### ContactsScreen
- List of saved contacts (name + phone if set)
- Add / edit / delete contacts
- Accessible from SettingsScreen
- Used by GameSetupScreen contact picker

### StatsScreen
- All-time leaderboard computed from finished games
- Columns: Player, Games, Total Won/Lost, Biggest Win
- Players matched by name (case-insensitive, trimmed) across games — display aggregation only, no effect on WhatsApp matching
- `biggestWin` is displayed as `$0.00` for players who have never had a positive net
- Accessible via button on HomeScreen (Pro gate)
- Note: name matching is best-effort; players with slightly different spellings across games appear as separate rows

### SettingsScreen
- Currency symbol input (default "$")
- "Manage Contacts" → ContactsScreen (Pro)
- "Export All Games (CSV)" (Pro)
- "Backup Data" → share JSON file (Pro)
- "Restore Data" → file picker, import JSON (Pro)
- Pro badge / "Unlock Pro" button
- App version

---

## Modified Screens

### HomeScreen
- Add "Stats" button in header (Pro gated)
- Add "Settings" button in header
- Show game count indicator when `!isPro && gameCount <= 3`; hidden when Pro or when `gameCount > 3` (post-restore state). Display format: `"1/3 games used"`, `"2/3 games used"`, `"3/3 games used — upgrade to add more"` (at the limit)
- Show Pro badge in header when unlocked

### GameSetupScreen
- "Game Name" field at top is only shown to Pro users (hidden entirely for free users)
- "From Contacts" button per player row (Pro) — opens a full-screen contact picker modal with a search field and scrollable list of saved contacts. Empty state: "No contacts saved — add them in Settings." Tapping a contact populates the name text field for that row and dismisses the modal. No inline contact creation — only pick from existing contacts. No phone number is stored in the game flow.

### SettlementScreen
- Add "WhatsApp" section below existing share button (Pro gated)
- The WhatsApp section container is always shown when Pro (it is never hidden by the transfer count)
- "Share Summary to WhatsApp" button — always shown
- "Message Players" button — opens a modal listing one row per transfer, each with a send button; this button is hidden when there are zero transfers (break-even case), leaving only "Share Summary" in the section

### GameDetailScreen
- Show game name in header if set
- Add "Export Game (CSV)" button (Pro)

---

## WhatsApp Integration

Uses `whatsapp://send` deep link URL scheme. No API keys or backend.

`Linking.canOpenURL('whatsapp://send')` is async and is called once when the WhatsApp section mounts. This requires `LSApplicationQueriesSchemes: ["whatsapp"]` in `app.config.js` under `expo.ios` (iOS). While the check is pending, the WhatsApp section renders nothing (null). Once resolved: if WhatsApp is installed, render the buttons; if not, replace the section with a "WhatsApp not installed" note.

### Share Summary
Opens WhatsApp with full settlement text pre-filled; user picks recipient/group:
```
whatsapp://send?text=<encoded summary>
```

Summary format:
```
🃏 Poker Night Results

Dan → Maya: $45.00
Tom → Alex: $20.00

Total pot: $280.00
```

### Message Players individually — one message per transfer

The message list is driven by **transfers**, not players. Each transfer is one row with a "Send" button. This handles the case where one player owes money to multiple creditors — they receive one message per transfer.

For each transfer `{ from, to, amount }`:
- Look up contact for `from` by case-insensitive name match against saved contacts
- If exactly one match with a phone → deep link: `whatsapp://send?phone=<phone>&text=<message>`
- If multiple contacts match the name → show inline picker in that row (name + last 4 digits of phone); user selects before sending
- If no match or no phone → row shows note: *"Add [Name] to Contacts to send this message"*, no send button

Message text per transfer:
```
Hey [from] 🃏 Poker night is settled!
You owe [to] $[amount].
```

User taps "Send" per row → WhatsApp opens to that chat with pre-filled message → user taps send → returns to app → taps next.

---

## Stats Computation

On StatsScreen load, iterate all finished games:

```ts
interface PlayerStat {
  name: string;           // display key; matched case-insensitively across games
  gamesPlayed: number;
  totalNet: number;       // sum of net across all games
  biggestWin: number;     // highest single-game net; 0 if never positive
}
```

Player identity is by `name.trim().toLowerCase()`. Sorted by `totalNet` descending. `biggestWin` displayed as `$0.00` when zero.

---

## Export (CSV)

Games without a name use `"Unnamed Game"` as the fallback in the `Game` column (not the date — using the date would make the `Game` and `Date` columns identical for unnamed games, which is confusing in a spreadsheet).

### Single game (from GameDetailScreen)
```
Game,Date,Player,Total In,Cash Out / Final Chips,Net
Friday Night,2026-04-07,Dan,100.00,145.00,+45.00
Friday Night,2026-04-07,Maya,100.00,55.00,-45.00

Transfers
From,To,Amount
Dan,Maya,45.00
```

### All games (from SettingsScreen)
Same player-level column layout, all games concatenated, separated by a blank row. Transfers are intentionally omitted — they are derivable from the player data and would require a second header mid-file. Users who need transfer data for a specific game should use the per-game export from GameDetailScreen.

```
Game,Date,Player,Total In,Cash Out / Final Chips,Net
Friday Night,2026-04-07,Dan,100.00,145.00,+45.00
Friday Night,2026-04-07,Maya,100.00,55.00,-45.00

2026-04-05,2026-04-05,Tom,50.00,80.00,+30.00
2026-04-05,2026-04-05,Alex,50.00,20.00,-30.00
```

Delivered via `expo-file-system` write to cache dir + native share sheet. No file system permissions required.

---

## Backup & Restore

### Backup
Serialises `{ games, contacts }` to `pokersplitter-backup-YYYY-MM-DD.json`. The `isPro` flag is intentionally excluded — Pro status comes from RevenueCat, not a local file.

Opens native share sheet — user saves to iCloud Drive, Google Drive, email, etc.

### Restore
Opens `expo-document-picker` filtered to `.json`.
On file selected:
- Parse JSON; validate that it contains a `games` array (required) and optionally a `contacts` array
- Each object in `games` must have `id` (string), `status` (`"active"` or `"finished"`), `players` (array), and `date` (number). Any game object failing this check causes the entire restore to fail with an error alert — no partial writes
- Any other top-level keys (including any `isPro` field) are silently ignored
- If an active game exists in current storage, show a specific warning: *"You have a game in progress. Restoring will discard it. Continue?"*
- Otherwise show the standard confirmation: *"This will replace all current data. Continue?"*
- On confirm: overwrite both `"games"` and `"contacts"` MMKV keys entirely. If the backup has no `contacts` array, `"contacts"` is reset to an empty array (existing contacts are not preserved — restore is a full replacement)
- Reload app state after write

**Restore and the free-tier gate:** Restored games are fully loaded regardless of count. The 3-game gate (`loadGames().length >= 3`) applies only to creating new games. After restoring a backup with 10 games, a free user has all 10 in history. The game count indicator is hidden when `gameCount > 3` and user is not Pro (indicator shown only when `!isPro && gameCount <= 3`).

---

## Navigation Changes

```
Stack Navigator
├── HomeScreen                  (+ Stats button, Settings button)
├── GameSetupScreen             (+ name field Pro-only, contact picker Pro)
├── ActiveGameScreen            (unchanged)
├── FinalChipCountScreen        (unchanged)
├── SettlementScreen            (+ WhatsApp section Pro)
├── GameDetailScreen            (+ export button Pro)
├── PaywallScreen               (NEW — no navigation params)
├── StatsScreen                 (NEW)
├── SettingsScreen              (NEW)
└── ContactsScreen              (NEW)
```

---

## Edge Cases

| Scenario | Handling |
|---|---|
| User hits 3-game limit | PaywallScreen shown on "New Game" tap |
| User deletes a game | Frees a slot; gate check re-evaluates on next "New Game" tap |
| Pro feature tapped without Pro | PaywallScreen shown; user re-taps feature after unlock |
| RevenueCat offline | Use cached `isPro` from MMKV |
| Pro entitlement revoked (refund) | Next launch `getCustomerInfo()` sets `isPro = false` in MMKV |
| WhatsApp not installed | `Linking.canOpenURL` check on render; replace section with note |
| Zero transfers (break-even) | "Message Players" button hidden; "Share Summary" still shown |
| Contact name matches multiple contacts | Inline picker shown in that transfer row (name + last 4 digits) |
| Contact name doesn't match any contact | Row shows "Add to Contacts" note; no send button |
| Restore with invalid JSON | Show error alert, no data written |
| Restore with valid JSON but malformed game objects | Show error alert, no data written |
| `getCustomerInfo()` throws non-network error | Fall back to cached MMKV value |
| Purchase completes while `getCustomerInfo()` in-flight | Purchase result wins; in-flight result ignored |
| WhatsApp `canOpenURL` check pending | WhatsApp section renders nothing until resolved |
| Game has no name (unnamed) | CSV `Game` column shows `"Unnamed Game"` |
| Restore while active game exists | Warn specifically about in-progress game loss before confirming |
| Restore backup with >3 games (free user) | All games loaded; gate count indicator hidden (`gameCount > 3`); gate applies to new game creation only |
| Restore backup with no contacts array | `"contacts"` MMKV key reset to empty array |
| Backup file contains `isPro` key | Ignored silently during restore |
| Game has no name (unnamed) | CSV `Game` column shows `"Unnamed Game"` |
| Player never had positive net (biggestWin) | Displayed as `$0.00` in Stats table |

---

## Out of Scope

- Subscription pricing (one-time only)
- Server-side receipt validation
- Push notifications
- Multi-device sync
- Tournament / side pot support
- In-app currency conversion
- Auto-resuming actions after paywall (user re-taps instead)
- Feature-specific messaging on PaywallScreen
