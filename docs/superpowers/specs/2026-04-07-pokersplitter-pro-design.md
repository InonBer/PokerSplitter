# PokerSplitter Pro — Design Spec

**Date:** 2026-04-07

## Overview

Add a freemium monetization layer and a set of Pro features to the existing PokerSplitter app. The free tier remains fully functional for up to 3 games. A one-time $2.99 "Pro" unlock removes the cap and adds player contacts, WhatsApp integration, statistics, CSV export, and backup/restore.

In-app purchases are handled via RevenueCat (`react-native-purchases`), which wraps Apple StoreKit and Google Play Billing. No backend required.

---

## Tech Stack additions

| Addition | Library |
|---|---|
| In-app purchases | `react-native-purchases` (RevenueCat) |
| File picker (restore) | `expo-document-picker` |
| File system (export/backup) | `expo-file-system` + native share sheet |

---

## Free vs Pro

**Free tier:**
- Full game flow (setup → active game → chip count → settlement → share)
- Up to 3 games created (active or finished)
- Game history for those 3 games

**Pro ($2.99 one-time unlock):**
- Unlimited game creation
- Game naming
- Player contacts (name + optional phone number)
- Contact picker in Game Setup (replaces typing names)
- WhatsApp integration (share summary + individual player messages)
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
1. User tries to create 4th game OR taps a locked Pro feature
2. `PaywallScreen` is shown — lists Pro features, shows price
3. User taps "Unlock Pro — $2.99" → native Apple/Google payment sheet (RevenueCat)
4. On success: `isPro = true` written to MMKV, screen dismissed, action proceeds
5. "Restore Purchase" button available for reinstalls

### Pro status verification
- On every app launch: call RevenueCat `getCustomerInfo()`, update `isPro` in MMKV
- Local MMKV cache used for offline / between launches
- RevenueCat dashboard provides revenue analytics

### Gate enforcement
- `useProStatus()` hook reads MMKV `isPro` value reactively
- Any component needing Pro wraps its action with a `requirePro()` guard that navigates to PaywallScreen if not Pro

---

## New Screens

### PaywallScreen
- Header: "Unlock PokerSplitter Pro"
- Feature list with icons (unlimited games, contacts, WhatsApp, stats, export, backup)
- "Unlock Pro — $2.99" primary button
- "Restore Purchase" secondary button
- Dismiss button (X) in header

### ContactsScreen
- List of saved contacts (name + phone if set)
- Add / edit / delete contacts
- Accessible from SettingsScreen
- Used by GameSetupScreen contact picker

### StatsScreen
- All-time leaderboard computed from finished games
- Columns: Player, Games, Total Won/Lost, Biggest Win
- Players matched by name (case-insensitive) across games
- Accessible via button on HomeScreen (Pro gate)

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
- Add optional "Game Name" field at top (Pro — shown but gated on confirm if not Pro)
- Add "From Contacts" button per player row (Pro) — opens contact picker modal, populates name + stores phone for WhatsApp

### SettlementScreen
- Add "WhatsApp" section below existing share button (Pro gated)
- "Share Summary to WhatsApp" button
- "Message Players" button — shows list of players, each with send button if phone known

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

### Message Players individually
For each player in the settlement:
- If a contact with a matching name (case-insensitive) has a phone number → deep link to their chat with personalised message
- If no phone found → skipped, shown in a "missing contacts" note

Personalised messages:
- Winner: *"Hey Maya 🃏 Poker night is settled! You're owed $30.00 from Dan."*
- Loser: *"Hey Alex 🃏 Poker night is settled! You owe $45.00 to Dan."*
- Broke even: *"Hey Tom 🃏 Poker night is settled! You broke even tonight."*

User taps "Send" per player — each tap opens WhatsApp to that chat, user hits send, returns to app.

Players without a phone number show a note: *"Add phone number in Contacts to message [Name]."*

---

## Stats Computation

On StatsScreen load, iterate all finished games:

```ts
interface PlayerStat {
  name: string;
  gamesPlayed: number;
  totalNet: number;       // sum of net across all games
  biggestWin: number;     // highest single-game net
}
```

Player identity is by name (case-insensitive, trimmed). Same player appearing in multiple games aggregates into one row. Sorted by `totalNet` descending.

---

## Export (CSV)

### Single game (from GameDetailScreen)
```
Player,Total In,Cash Out / Final Chips,Net
Dan,100,145,+45
Maya,100,55,-45
```
Followed by settlement transfers section.

### All games (from SettingsScreen)
One row per player per game, includes game date and name.

Delivered via `expo-file-system` write to cache dir + native share sheet. No permissions required.

---

## Backup & Restore

### Backup
Serialises `{ games, contacts }` to `pokersplitter-backup-YYYY-MM-DD.json`.
Opens native share sheet — user saves to iCloud Drive, Google Drive, email, etc.

### Restore
Opens `expo-document-picker` filtered to `.json`.
On file selected:
- Parse and validate structure
- Show confirmation: "This will replace all current data. Continue?"
- On confirm: write to MMKV, reload app state

---

## Navigation Changes

```
Stack Navigator
├── HomeScreen                  (+ Stats button, Settings button)
├── GameSetupScreen             (+ name field, contact picker)
├── ActiveGameScreen            (unchanged)
├── FinalChipCountScreen        (unchanged)
├── SettlementScreen            (+ WhatsApp section)
├── GameDetailScreen            (+ export button)
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
| Pro feature tapped without Pro | PaywallScreen shown, action resumes after unlock |
| RevenueCat offline | Use cached `isPro` from MMKV |
| WhatsApp not installed | `Linking.canOpenURL` check; show "WhatsApp not installed" alert |
| Contact name doesn't match player | Skipped in individual messaging with note |
| Restore with invalid JSON | Show error alert, no data written |
| Duplicate contact names | Allowed — user picks from list manually |

---

## Out of Scope

- Subscription pricing (one-time only)
- Server-side receipt validation
- Push notifications
- Multi-device sync
- Tournament / side pot support
- In-app currency conversion
