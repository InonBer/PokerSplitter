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

`app.json` must include the RevenueCat Expo config plugin and platform-specific API keys (iOS + Android). `expo-build-properties` is required to support the native build.

---

## Free vs Pro

**Free tier:**
- Full game flow (setup → active game → chip count → settlement → share)
- Up to 3 games at a time (counted as games currently in storage — deleted games free up the slot)
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
4. On success: `isPro = true` written to MMKV, PaywallScreen pops, user must re-tap the feature (no auto-resume)
5. "Restore Purchase" button available for reinstalls

**No automatic action resumption.** After purchase, the user is returned to where they were and can immediately use the unlocked feature. Passing action callbacks through navigation params is not used — it adds complexity for minimal UX benefit.

### Pro status verification
- On every app launch: call RevenueCat `getCustomerInfo()`, update `isPro` in MMKV
- Local MMKV cache used for offline / between launches
- RevenueCat dashboard provides revenue analytics

### Gate enforcement
- `useProStatus()` hook reads MMKV `isPro` value reactively
- Any component needing Pro calls `requirePro(navigation)` before acting: if not Pro, navigates to PaywallScreen and returns early

---

## New Screens

### PaywallScreen
- Header: "Unlock PokerSplitter Pro"
- Feature list with icons (unlimited games, contacts, WhatsApp, stats, export, backup)
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
- Show game count indicator when approaching free limit (e.g. "2/3 games used")
- Show Pro badge in header when unlocked

### GameSetupScreen
- "Game Name" field at top is only shown to Pro users (hidden entirely for free users, not shown-but-blocked)
- "From Contacts" button per player row (Pro) — opens contact picker modal, populates name field; phone number is stored on the player entry in local component state for WhatsApp use during that session (not persisted to the Game data model)

### SettlementScreen
- Add "WhatsApp" section below existing share button (Pro gated)
- "Share Summary to WhatsApp" button
- "Message Players" button — opens a modal listing one row per transfer (not per player), each with a send button

### GameDetailScreen
- Show game name in header if set
- Add "Export Game (CSV)" button (Pro)

---

## WhatsApp Integration

Uses `whatsapp://send` deep link URL scheme. No API keys or backend.

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

The message list is driven by **transfers**, not players. Each transfer is one row with a "Send" button. This correctly handles the case where one player owes money to multiple creditors.

For each transfer `{ from, to, amount }`:
- Look up contact for `from` (case-insensitive name match against saved contacts)
- If contact has a phone → deep link: `whatsapp://send?phone=<phone>&text=<message>`
- If no contact / no phone → show note: *"Add [Name] to Contacts to send this message"*

Message text per transfer:
```
Hey [from] 🃏 Poker night is settled!
You owe [to] $[amount].
```

User taps "Send" per row → WhatsApp opens to that chat with pre-filled message → user taps send → returns to app → taps next.

**Duplicate contact name handling:** If a contact name matches multiple contacts in storage, a small inline picker is shown directly in that row (showing name + partial phone number) so the user selects which contact to use before sending.

**`Linking.canOpenURL`** is checked once when the WhatsApp section renders. If WhatsApp is not installed, the entire WhatsApp section shows a single "WhatsApp not installed" message instead of buttons.

---

## Stats Computation

On StatsScreen load, iterate all finished games:

```ts
interface PlayerStat {
  name: string;           // display key; matched case-insensitively across games
  gamesPlayed: number;
  totalNet: number;       // sum of net across all games
  biggestWin: number;     // highest single-game net (0 if never won)
}
```

Player identity is by `name.trim().toLowerCase()`. Sorted by `totalNet` descending.

---

## Export (CSV)

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
Same column layout as single game, all games concatenated, separated by a blank row between games:
```
Game,Date,Player,Total In,Cash Out / Final Chips,Net
Friday Night,2026-04-07,Dan,100.00,145.00,+45.00
Friday Night,2026-04-07,Maya,100.00,55.00,-45.00

Saturday Game,2026-04-05,Tom,50.00,80.00,+30.00
Saturday Game,2026-04-05,Alex,50.00,20.00,-30.00
```

Transfers are not included in the all-games export (they are derivable and would clutter the file).

Delivered via `expo-file-system` write to cache dir + native share sheet. No file system permissions required.

---

## Backup & Restore

### Backup
Serialises `{ games, contacts }` to `pokersplitter-backup-YYYY-MM-DD.json`.
Opens native share sheet — user saves to iCloud Drive, Google Drive, email, etc.

### Restore
Opens `expo-document-picker` filtered to `.json`.
On file selected:
- Parse and validate structure (`games` array + optional `contacts` array)
- Show confirmation: "This will replace all current data. Continue?"
- On confirm: write to MMKV, reload app state
- Restored data is fully loaded regardless of game count — the 3-game gate only applies to creating new games, not to restoring a backup. A free user who restores a backup with 10 games will have all 10 in history but cannot create a new game without Pro.

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
├── PaywallScreen               (NEW)
├── StatsScreen                 (NEW)
├── SettingsScreen              (NEW)
└── ContactsScreen              (NEW)
```

---

## Edge Cases

| Scenario | Handling |
|---|---|
| User hits 3-game limit | PaywallScreen shown on "New Game" tap |
| User deletes a game | Frees a slot; game count decrements |
| Pro feature tapped without Pro | PaywallScreen shown; user re-taps feature after unlock |
| RevenueCat offline | Use cached `isPro` from MMKV |
| WhatsApp not installed | `Linking.canOpenURL` check on render; show "WhatsApp not installed" note |
| Contact name matches multiple contacts | Inline picker shown in that transfer row |
| Contact name doesn't match any contact | Row shows "Add to Contacts" note; no send button |
| Restore with invalid JSON | Show error alert, no data written |
| Restore backup with >3 games (free user) | All games loaded; gate only applies to new game creation |

---

## Out of Scope

- Subscription pricing (one-time only)
- Server-side receipt validation
- Push notifications
- Multi-device sync
- Tournament / side pot support
- In-app currency conversion
- Auto-resuming actions after paywall (user re-taps instead)
