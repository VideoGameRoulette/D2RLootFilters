# D2R Loot Filter Tools

Tools and a **web app** for building **Diablo 2 Resurrected** loot filters. Create filters by selecting items across many categories (Normal, Magic, Rare, Uniques, Sets, Runes, Gems, etc.), then export JSON for in-game **Import from Clipboard**.

## Web app (recommended)

The Next.js app lets you browse and select items by category, load filters from file or paste, and export a single filter JSON.

```bash
cd frontend
yarn install
yarn copy-catalogs   # copy catalogs from repo root (build them first if needed)
yarn dev
```

Open [http://localhost:3000](http://localhost:3000). See [frontend/README.md](frontend/README.md) for details.

### Categories

- **Normal** · **Socketed / Ethereal** · **Normal Superior** · **Socketed / Ethereal Superior**
- **Magic** · **Rare** · **Unique** · **Sets**
- **Runes** · **Gems** · **Potions** · **Quest** · **Endgame** (tokens, essences, keys, organs)
- **Misc** · **Gold** filter

### Load filters

- **From file** – load a `.json` filter file (e.g. exported in-game or from another profile)
- **From paste** – paste JSON into a textbox, validate, then load into the page

### Export

- **Download** – export filter as `.json`
- **Copy** – copy JSON to clipboard for in-game **Import from Clipboard**

Game limits: 32 rules total, profile name without spaces, one rarity per show rule. See [DESIGN.md](DESIGN.md).

### Docker

```bash
cd frontend && yarn copy-catalogs && cd ..   # optional: populate catalogs from root
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000). Catalog data is mounted from `frontend/public/data` (run `yarn copy-catalogs` in `frontend/` to refresh from repo root).

## CLI (catalogs and filters)

- **Catalogs:** Build set, unique, base, quest, gem, and potion catalogs from [d2data](https://github.com/blizzhackers/d2data) and [diablo2.io](https://diablo2.io):
  - `node build-sets-catalog.mjs` → `catalog.sets.json`
  - `node build-uniques-catalog.mjs` → `catalog.uniques.json`
  - `node build-bases-catalog.mjs` → `catalog.bases.json`
  - `node build-quest-catalog.mjs` → `catalog.quest.json`
  - `node build-gems-catalog.mjs` → `catalog.gems.json`
  - `node build-potions-catalog.mjs` → `catalog.potions.json`
  - `node merge-catalogs.mjs` → `catalog.json`
- **Filter from selection:** `node build-selection-filter.mjs selection.json lootfilter.json` (one rule per category; see [DESIGN.md](DESIGN.md)).
- **Filter from full catalog:** `node build-filter.mjs catalog.json lootfilter.json "ProfileName"` (capped at 32 rules).
- **Merge two filters:** `node merge-filters.mjs set-filter.json unique-filter.json out.json "ProfileName"`.

## License

MIT. See [LICENSE](LICENSE).
