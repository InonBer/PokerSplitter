# i18n & RTL Support — Design Spec

## Overview

Add internationalization (English + Hebrew) with full RTL layout support to PokerSplitter. Language follows device locale by default, with a manual override in Settings. When Hebrew is active, the entire app layout flips to RTL.

## Goals

- Support English (en) and Hebrew (he)
- Full RTL layout flip when Hebrew is active
- Device locale detection with English fallback
- Manual language override persisted in MMKV
- App restart on language change (required by React Native's I18nManager)

## New Dependencies

All four must be installed:

- `i18next` — core translation engine (interpolation, pluralization)
- `react-i18next` — React bindings (useTranslation hook, re-renders on language change)
- `expo-localization` — device locale detection
- `react-native-restart` — app restart after RTL toggle (see App Restart section)

## Architecture

### File Structure

```
src/i18n/
  index.ts            — i18next config, locale detection, MMKV override, RTL setup
  changeLanguage.ts   — shared helper for language switch + restart flow
  locales/
    en.json           — English translations (~85 keys)
    he.json           — Hebrew translations (~85 keys)
```

All other changes are modifications to existing screens, components, and `whatsapp.ts`.

### Initialization (`src/i18n/index.ts`)

1. Read `userLanguage` from MMKV. If not set, detect via `expo-localization`.
2. Resolve language: if detected locale starts with `he`, use `he`; otherwise `en`.
3. Call `I18nManager.allowRTL(true)` and `I18nManager.forceRTL(language === 'he')` synchronously.
4. Initialize i18next with the resolved language, `en` as fallback, and both locale JSON files.
5. Export the configured i18n instance.

This file must be imported at the top of `App.tsx` before any component renders, so RTL is set before the first layout pass.

### Translation Keys

Flat namespace, grouped by screen prefix:

```json
{
  "home.newGame": "New Game",
  "home.noGames": "No games yet. Start one!",
  "home.gamesUsed": "{{count}}/{{limit}} games used",
  "home.gamesUsedMax": "{{limit}}/{{limit}} games used — upgrade to add more",
  "home.players": "{{count}} players",
  "home.active": "Active",
  "home.finished": "Finished",
  "setup.gameName": "Game name (optional)",
  "setup.playerName": "Player name",
  "setup.buyIn": "Buy-in $",
  ...
}
```

Pluralization uses i18next's built-in `count` interpolation (e.g., `settlement.transfers` with `_one` and `_other` suffixes).

### String Extraction Scope

| File | Approx. Keys | Notes |
|---|---|---|
| HomeScreen | 6 | Game count indicator, empty state, button, status labels |
| GameSetupScreen | 7 | Placeholders, alerts, buttons |
| ActiveGameScreen | 5 | Alerts, modal titles, button |
| FinalChipCountScreen | 4 | Hint, placeholder, alert, button |
| SettlementScreen | 12 | Transfer text, buttons, modal, WhatsApp labels |
| PaywallScreen | 10 | Title, subtitle, features list, buttons, alerts |
| StatsScreen | 5 | Column headers, empty state |
| SettingsScreen | 10 | Section titles, row labels, version, alerts, language picker |
| GameDetailScreen | ~5 | (estimated) |
| ContactsScreen | ~4 | (estimated) |
| PlayerRow | 4 | Status labels, button text |
| AmountModal | 3 | Placeholder, buttons |
| ContactPickerModal | ~3 | (estimated) |
| TransferRow | ~2 | (estimated) |
| App.tsx | 3 | Header titles, button labels |
| whatsapp.ts | ~5 | WhatsApp message templates (see below) |

**Total**: ~85 translation keys per language.

### Usage in Components

Every screen/component with user-facing strings:

```tsx
import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
  const { t } = useTranslation();
  // ...
  return <Text>{t('home.newGame')}</Text>;
}
```

### Navigation Titles in App.tsx

Screen titles currently use static `options={{ title: 'New Game' }}`. Since `useTranslation()` can only be called inside a component, navigation titles must use the `options` function form. Two approaches:

**Option A (recommended)**: Wrap each screen component so `t()` is available:
```tsx
<Stack.Screen
  name="GameSetup"
  component={GameSetupScreen}
  options={{ title: t('nav.gameSetup') }}  // won't work — t not in scope
/>
```

Instead, use a wrapper component or set the title from within each screen via `navigation.setOptions({ title: t('nav.gameSetup') })` in a `useEffect`. Several screens already use `navigation.setOptions`, so this pattern is consistent with the codebase.

**Option B**: Create a small `useTranslatedTitle(key)` hook that each screen calls, encapsulating the `setOptions` call.

Either approach works. Option B is cleaner if adopted consistently.

## RTL Support

### Mechanism

- `I18nManager.allowRTL(true)` + `I18nManager.forceRTL(true)` when Hebrew is active
- `I18nManager.forceRTL(false)` when English is active
- Set synchronously in `src/i18n/index.ts` before first render

### What Flips

- `flexDirection: 'row'` renders right-to-left
- Navigation back button moves to the right side
- Chevrons flip automatically
- Text alignment mirrors
- Margins/padding using logical properties (`Start`/`End`) flip correctly

### Style Migration

Hardcoded directional styles (`marginRight`, `paddingLeft`, etc.) will be reviewed and replaced with logical properties (`marginStart`, `marginEnd`, `paddingStart`, `paddingEnd`) where they affect RTL layout. For edge cases where logical properties are insufficient, `I18nManager.isRTL` can be used for conditional styling.

### Arrow and Chevron Characters

- Chevron characters (`›`) in HomeScreen and SettingsScreen will flip automatically with RTL layout, but should be verified during implementation.
- The arrow (`→`) in `TransferRow.tsx` and share messages (`SettlementScreen.tsx`) represents a directional "pays" relationship (from → to). This should use `←` in RTL or be replaced with a translated key: `t('common.arrow')` that maps to `→` in English and `←` in Hebrew.
- The same arrow in WhatsApp share messages must also be translated.

### Number and Currency Direction

Dollar amounts and numbers should remain LTR even in RTL mode to avoid awkward rendering (e.g., `00.150$` instead of `$150.00`). Apply `writingDirection: 'ltr'` on `Text` components that display currency/numeric values, or use Unicode LTR marks in formatted strings.

**Currency localization is out of scope** — the `$` symbol stays hardcoded. This spec only covers language translation and layout direction.

### Date Formatting

`HomeScreen` calls `new Date(item.date).toLocaleDateString()` without a locale argument. This must pass the active i18n language to match the app's selected language:

```tsx
new Date(item.date).toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US')
```

### App Restart

React Native requires a restart for `I18nManager` changes to take effect.

**Restart mechanism**: Use `react-native-restart` (`RNRestart.restart()`). This works reliably in both development and production builds, unlike `expo-updates` `Updates.reloadAsync()` which requires `expo-updates` to be installed and only works in production/preview builds. `expo-updates` is not currently in the project.

**Shared helper** (`src/i18n/changeLanguage.ts`):

```tsx
export async function changeAppLanguage(newLang: 'en' | 'he') {
  // 1. Save to MMKV
  // 2. Change i18next language
  // 3. Set I18nManager.forceRTL(newLang === 'he')
  // 4. Show alert: "Language changed. App will restart."
  // 5. On OK, call RNRestart.restart()
}
```

This keeps SettingsScreen clean and makes the logic reusable/testable.

## Language Picker (Settings Screen)

### Location

New "General" section at the top of SettingsScreen, above the existing "Data" section.

### UI

A row labeled with the translated "Language" key, showing the current language in its native name ("English" / "עברית"). Language names are always displayed in their native form regardless of current app language.

### Flow

1. User taps "Language" row
2. Alert shows two options: "English", "עברית"
3. If selection differs from current language, call `changeAppLanguage(newLang)` (shared helper)

## WhatsApp Messages (`src/utils/whatsapp.ts`)

This file contains user-facing strings shared via WhatsApp:
- `"Poker Night Results"` title
- `"No transfers needed — everyone broke even!"` 
- Transfer lines with `→` arrows
- `"Total pot: $..."` 
- `"Hey {name} Poker night is settled! You owe {to} $..."` 

These must be translated. The `whatsapp.ts` functions will accept a `t` function parameter (or import `i18n.t` directly) to resolve translated templates. The arrow in transfer lines will use the translated `common.arrow` key.

## Scope Exclusions

- **Currency localization**: The `$` symbol remains hardcoded. Currency formatting is not part of this i18n pass.
- **Lazy loading translations**: With only ~85 keys per language, both locale files are bundled. Lazy loading is unnecessary at this scale.
- **Additional languages**: Only English and Hebrew. Adding more languages later is straightforward (add a new JSON file and update the picker).

## Decisions

- **Fallback language**: English (for any non-Hebrew device locale)
- **RTL scope**: Full layout flip (not text-only)
- **Locale detection**: Device locale with manual override in Settings
- **Restart on toggle**: Required by RN — alert informs user before restart
- **Restart library**: `react-native-restart` (works in dev and prod, no `expo-updates` dependency)
- **No new UI components**: Language picker uses native Alert, no custom modal needed

## Files Modified

- `App.tsx` — import i18n init, translate navigation titles
- All 10 screens — `useTranslation()` + string replacement
- All 4 components — same
- `SettingsScreen.tsx` — add language picker row + restart logic
- `src/utils/whatsapp.ts` — translate WhatsApp message templates
- `package.json` — add `i18next`, `react-i18next`, `expo-localization`, `react-native-restart`

## Files Not Modified

- `types.ts`, `storage.ts`, `settlement.ts` — no user-facing strings
