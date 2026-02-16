# Loot filter design (D2R)

## Game limits (from exported_from_game.json)

- **Rule cap:** 32 rules total (1 hide + 31 show).
- **Profile name:** No spaces allowed on import (use alphanumeric only).
- **Rule names:** Must be unique; only A–Z, a–z, 0–9, space (game-safe).
- **One rarity per show rule:** `equipmentRarity: ["set"]` or `["unique"]` only — not `["set","unique"]` in one rule.
- **Many codes per rule:** One show rule can list many item codes, e.g. `equipmentItemCode: ["usk","xpl","xlg","utb","wad"]`.

## Two ways to build filters

### 1. Per-item rules (current build-filter / merge-filters)

- One show rule per item (or per item code after merge/expand).
- Hits the 32-rule cap quickly with full catalogs.
- Good for: small, hand-picked lists or testing.

### 2. Selection → one rule per category (build-selection-filter, future web UI)

- User selects which **sets** and **uniques** they want.
- Output uses **one show rule per category** with all selected codes in that rule:
  - **Show - Selected Sets** → `equipmentRarity: ["set"]`, `equipmentItemCode: [all selected set codes]`
  - **Show - Selected Uniques** → `equipmentRarity: ["unique"]`, `equipmentItemCode: [all selected unique codes]`
- Total rules: 1 hide + 1–2 show (or a few more if you add categories). Stays under 32.
- Good for: full customization without hitting the cap.

## Future web UI

1. **Data:** Load `catalog.sets.json` and `catalog.uniques.json` (or merged `catalog.json`).
2. **UI:** Two lists (sets, uniques) with checkboxes or multi-select. Optional: search, group by set name / slot.
3. **Selection:** Persist selected item **codes** (and optionally labels) as JSON, e.g.  
   `{ "profileName": "MyFilter", "sets": ["usk","xpl",...], "uniques": ["cap","skp",...] }`.
4. **Build:** Call `build-selection-filter.mjs` (CLI or port the logic to Node/backend), or generate the filter JSON in the frontend using the same rule shape.
5. **Export:** User copies the generated filter JSON (or minified) and uses in-game **Import from clipboard**.

Optional enhancements:

- Save/load named selections (e.g. “MF set”, “SSF starter”).
- Extra categories (e.g. runes, gems) if the game supports them in the same format.
- “Select whole set” so one click adds all codes for a set.

## Scripts

| Script | Purpose |
|--------|--------|
| `build-filter.mjs` | Catalog → filter (one rule per item, capped at 32). |
| `merge-filters.mjs` | Merge two filter JSONs (set + unique), dedupe by code, expand to single-rarity, cap 32. |
| `build-selection-filter.mjs` | Selection JSON → filter with one rule per category (Selected Sets, Selected Uniques). |
| `build-sets-catalog.mjs` / `build-uniques-catalog.mjs` | Fetch d2data/diablo2.io → catalog JSON. |
| `merge-catalogs.mjs` | Merge set + unique catalogs → one catalog. |

## Selection JSON format (for build-selection-filter)

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
