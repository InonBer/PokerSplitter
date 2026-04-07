# i18n & RTL Support — Design Spec

## Overview

Add internationalization (English + Hebrew) with full RTL layout support to PokerSplitter. Language follows device locale by default, with a manual override in Settings. When Hebrew is active, the entire app layout flips to RTL.

## Goals

- Support English (en) and Hebrew (he)
- Full RTL layout flip when Hebrew is active
- Device locale detection with English fallback
- Manual language override persisted in MMKV
- App restart on language change (required by React Native's I18nManager)

## Dependencies

- `i18next` — core translation engine (interpolation, pluralization)
- `react-i18next` — React bindings (useTranslation hook, re-renders on language change)
- `expo-localization` — device locale detection

## Architecture

### File Structure

```
src/i18n/
  index.ts          — i18next config, locale detection, MMKV override, RTL setup
  locales/
    en.json         — English translations (~80 keys)
    he.json         — Hebrew translations (~80 keys)
```

No new files beyond the `src/i18n/` directory. All other changes are modifications to existing screens and components.

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
| SettingsScreen | 8 | Section titles, row labels, version, alerts |
| GameDetailScreen | ~5 | (estimated) |
| ContactsScreen | ~4 | (estimated) |
| PlayerRow | 4 | Status labels, button text |
| AmountModal | 3 | Placeholder, buttons |
| ContactPickerModal | ~3 | (estimated) |
| TransferRow | ~2 | (estimated) |
| App.tsx | 3 | Header titles, button labels |

**Total**: ~80 translation keys per language.

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

Navigation titles in `App.tsx` use `options` functions that call `t()`.

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

Hardcoded directional styles (`marginRight`, `paddingLeft`, etc.) will be reviewed and replaced with logical properties (`marginStart`, `marginEnd`, `paddingStart`, `paddingEnd`) where they affect RTL layout.

Chevron characters (`›`) will be replaced with a direction-aware approach (either translated key or conditional rendering).

### App Restart

React Native requires a restart for `I18nManager` changes to take effect. On language change:

1. Save new language to MMKV (`userLanguage`)
2. Change i18next language
3. Set `I18nManager.forceRTL()`
4. Show alert: "Language changed. App will restart."
5. On OK, call `Updates.reloadAsync()` to restart

## Language Picker (Settings Screen)

### Location

New "General" section at the top of SettingsScreen, above the existing "Data" section.

### UI

A row labeled with the translated "Language" key, showing the current language in its native name ("English" / "עברית"). Language names are always displayed in their native form regardless of current app language.

### Flow

1. User taps "Language" row
2. Alert shows two options: "English", "עברית"
3. If selection differs from current language:
   - Save to MMKV (`userLanguage: 'en' | 'he'`)
   - Change i18next language
   - Call `I18nManager.forceRTL(newLang === 'he')`
   - Show confirmation: "Language changed. App will restart."
   - On OK, call `Updates.reloadAsync()`

## Decisions

- **Fallback language**: English (for any non-Hebrew device locale)
- **RTL scope**: Full layout flip (not text-only)
- **Locale detection**: Device locale with manual override in Settings
- **Restart on toggle**: Required by RN — alert informs user before restart
- **No new UI components**: Language picker uses native Alert, no custom modal needed

## Files Modified

- `App.tsx` — import i18n init, translate navigation titles
- All 10 screens — `useTranslation()` + string replacement
- All 4 components — same
- `SettingsScreen.tsx` — add language picker row + restart logic
- `package.json` — new dependencies

## Files Not Modified

- `types.ts`, `storage.ts`, `settlement.ts`, utility files — i18n is purely a UI concern
