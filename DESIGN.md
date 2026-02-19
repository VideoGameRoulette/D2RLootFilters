# Loot filter design (D2R)

## Game limits (from exported_from_game.json)

- **Rule cap:** 32 rules total (1 hide + 31 show).
- **Profile name:** No spaces allowed on import (use alphanumeric only).
- **Rule names:** Must be unique; only A–Z, a–z, 0–9, space (game-safe).
- **One rarity per show rule:** Equipment show rules use a single rarity, e.g. `equipmentRarity: ["set"]` or `["unique"]` or `["normal"]` or `["hiQuality"]` — not mixed in one rule.
- **Many codes per rule:** One show rule can list many item codes, e.g. `equipmentItemCode: ["usk","xpl","xlg","utb","wad"]`.
- **itemCategory:** Rules can target categories without listing every code: `itemCategory: ["gems"]`, `["runes"]`, `["absol"]`, `["terrt"]`, `["uberm"]` (all items in that category). The web app uses these when loading/exporting endgame and when loading filters that use category-only rules.

## Two ways to build filters

### 1. CLI: per-item rules (build-filter / merge-filters)

- One show rule per item (or per item code after merge/expand).
- Hits the 32-rule cap quickly with full catalogs.
- Good for: small, hand-picked lists or testing.

### 2. Web app: selection → one rule per category (recommended)

- User selects items in each category (Normal, Socketed/Ethereal, Normal Superior, Socketed/Ethereal Superior, Magic, Rare, Unique, Sets, Runes, Gems, Potions, Quest, Endgame, Misc, Gold).
- Output uses **one show rule per category** with all selected codes in that rule (or `itemCategory` for endgame). Order and rule shape are defined in `frontend/lib/buildFilter.ts`.
- Total rules: 1 hide + up to one show rule per category. Stays under 32.
- Good for: full customization without hitting the cap.

## Web app

- **Data:** Loads catalogs from `frontend/public/data/`: sets, uniques, bases, gems, potions, quest.
- **UI:** Tabbed categories; search, Select all / Copy / Paste / Clear per list. Copy/Paste (for Normal→Rare) lets you copy selected base codes from one tab and paste into another. Tab bar scrolls with left/right arrows when it overflows.
- **Load filter:** From file (`.json`) or from paste (modal dialog). Input is validated with `parseLoadedFilter()` before applying; invalid JSON or missing `name`/`rules` shows an error.
- **Apply loaded filter:** Parsed rules are mapped to app state (normal, socketed/ethereal, hiQuality variants, magic, rare, unique, set, runes, gems, potions, quest, endgame, misc, gold). Category-only rules (`itemCategory: ["gems"]`, `["runes"]`, `["absol"]`, `["terrt"]`, `["uberm"]`) select all items in that category. `equipmentCategory`-only rules (e.g. all rings, all amulets) map to the corresponding base codes.
- **Export:** Download JSON or copy to clipboard for in-game **Import from Clipboard**.

## Scripts

| Script | Purpose |
|--------|--------|
| `build-filter.mjs` | Catalog → filter (one rule per item, capped at 32). |
| `merge-filters.mjs` | Merge two filter JSONs (set + unique), dedupe by code, expand to single-rarity, cap 32. |
| `build-selection-filter.mjs` | Selection JSON → filter with one rule per category (Selected Sets, Selected Uniques). |
| `build-sets-catalog.mjs` | Fetch d2data/diablo2.io → set catalog. |
| `build-uniques-catalog.mjs` | Fetch d2data/diablo2.io → unique catalog. |
| `build-bases-catalog.mjs` | Build base item catalog (Normal/Magic/Rare). |
| `build-quest-catalog.mjs` | Build quest/endgame item catalog. |
| `build-gems-catalog.mjs` | Build gems catalog. |
| `build-potions-catalog.mjs` | Build potions catalog. |
| `merge-catalogs.mjs` | Merge set + unique catalogs → one catalog. |

Catalogs are built from the repo root. The frontend copies them into `frontend/public/data/` via `node copy-catalogs.mjs` (run from `frontend/`).

## Selection / export format (web app)

The web app does not persist a single “selection JSON” file; it builds the filter in memory from current UI state. The **exported filter** has this shape:

- `name`: profile name (game-safe, no spaces).
- `rules`: array of rules. First rule is the hide-all rule; then one show rule per category that has selections, in order: Normal, Socketed Ethereal, Normal Superior, Socketed Ethereal Superior, Magic, Rare, Uniques, Sets, Runes, Quest (then endgame rules by `itemCategory`: Essence/Token of Absolution, Terrorize Tokens, Uber Materials), Gems, Misc (per label), Gold (hide) if enabled.

For CLI `build-selection-filter.mjs`, the **selection JSON** format is:

```json
{
  "profileName": "MyFilter",
  "sets": ["usk", "xpl", "xlg", "utb", "wad"],
  "uniques": ["cap", "skp", "hlm"]
}
```

- `profileName`: optional; no spaces (script strips to alphanumeric).
- `sets`: array of set item codes (from catalog).
- `uniques`: array of unique item codes (from catalog).

Empty arrays are fine; no show rule is emitted for that category.
