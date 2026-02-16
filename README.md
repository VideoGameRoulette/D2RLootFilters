# D2R Loot Filter Tools

Tools and a **web app** for building **Diablo 2 Resurrected** loot filters. Create filters by selecting sets and uniques, then export JSON for in-game **Import from Clipboard**.

## Web app (recommended)

The Next.js app lets you browse sets and uniques, select what to show, and export a single filter JSON.

```bash
cd frontend
npm install
node copy-catalogs.mjs   # copy catalogs from repo root (build them first if needed)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). See [frontend/README.md](frontend/README.md) for details.

### Docker

```bash
cd frontend && node copy-catalogs.mjs && cd ..   # optional: populate catalogs from root
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000). Catalog data is mounted from `frontend/public/data` (run `node copy-catalogs.mjs` in `frontend/` to refresh from repo root).

## CLI (catalogs and filters)

- **Catalogs:** Build set, unique, and base item lists from [d2data](https://github.com/blizzhackers/d2data) and [diablo2.io](https://diablo2.io):
  - `node build-sets-catalog.mjs` → `catalog.sets.json`
  - `node build-uniques-catalog.mjs` → `catalog.uniques.json`
  - `node build-bases-catalog.mjs` → `catalog.bases.json` (for Normal/Magic/Rare selection)
  - `node merge-catalogs.mjs` → `catalog.json`
- **Filter from selection:** `node build-selection-filter.mjs selection.json lootfilter.json` (one rule per category; see [DESIGN.md](DESIGN.md)).
- **Filter from full catalog:** `node build-filter.mjs catalog.json lootfilter.json "ProfileName"` (capped at 32 rules).
- **Merge two filters:** `node merge-filters.mjs set-filter.json unique-filter.json out.json "ProfileName"`.

Game limits: 32 rules total, profile name without spaces, one rarity per show rule. See [DESIGN.md](DESIGN.md).

## License

MIT. See [LICENSE](LICENSE).
