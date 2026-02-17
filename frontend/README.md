# D2R Loot Filter Builder (Web)

Next.js frontend for building **Diablo 2 Resurrected** loot filters. Select items across many categories, load filters from file or paste, then export JSON for in-game **Import from Clipboard**.

## Features

- **Categories:** Normal, Socketed / Ethereal, Normal Superior, Socketed / Ethereal Superior, Magic, Rare, Unique, Sets, Runes, Gems, Potions, Quest, Endgame (tokens, essences, keys, organs), Misc, and Gold filter
- **Search** and select items; **Select all** / **Copy** / **Paste** / **Clear** per list (Copy/Paste on Normal → Rare tabs for sharing lists between categories)
- **Load filters:**
  - From file – pick a `.json` filter file
  - From paste – paste JSON into a textbox; the input is validated before load
- **Export** filter as JSON; **Copy** to clipboard for in-game **Import from Clipboard**
- **Tab group** – horizontal tabs with left/right scroll arrows when content overflows
- **Images** – item images from local assets; Maxroll images for uniques and sets when available
- One rule per category so the filter stays under the game’s 32-rule cap

## Setup

```bash
cd frontend
yarn install
```

**Catalogs:** The app loads catalogs from `public/data/`:
- `catalog.sets.json`, `catalog.uniques.json`, `catalog.bases.json`
- `catalog.gems.json`, `catalog.potions.json`, `catalog.quest.json`

To refresh from the repo’s generated catalogs (from the repo root):

```bash
yarn copy-catalogs
```

Run that from the `frontend/` directory after building catalogs in the root (`node build-sets-catalog.mjs`, `node build-uniques-catalog.mjs`, etc.).

## Run

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
yarn build
yarn start
```

## Docker

From the repo root:

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000). The image uses `output: "standalone"` for a smaller production build. Catalog files are mounted from `frontend/public/data`; run `yarn copy-catalogs` in `frontend/` to refresh them from the repo root before building/starting.

## Tech

- Next.js 14+ (App Router), TypeScript, Tailwind CSS
- Yarn 4
