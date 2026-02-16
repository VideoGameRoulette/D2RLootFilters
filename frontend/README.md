# D2R Loot Filter Builder (Web)

Next.js frontend for building **Diablo 2 Resurrected** loot filters. Select sets and uniques, then export a single JSON file for in-game **Import from Clipboard**.

## Features

- Load set and unique catalogs (from this repo’s data)
- Search and select items; “Select all” / “Clear” per list
- One rule per category (Selected Sets, Selected Uniques) so the filter stays under the game’s 32-rule cap
- Export filter as JSON and use in D2R: open file → Ctrl+A, Ctrl+C → in-game **Import from Clipboard**

## Setup

```bash
cd frontend
npm install
```

**Catalogs:** The app loads `/data/catalog.sets.json` and `/data/catalog.uniques.json` from `public/data/`. To refresh them from the repo’s generated catalogs (from the repo root):

```bash
node copy-catalogs.mjs
```

Run that from the `frontend/` directory after building catalogs in the root (`node build-sets-catalog.mjs`, `node build-uniques-catalog.mjs`).

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Docker

From the repo root:

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000). The image uses `output: "standalone"` for a smaller production build. Catalog files are mounted from `frontend/public/data`; run `node copy-catalogs.mjs` in `frontend/` to refresh them from the repo root before building/starting.

## Tech

- Next.js 14 (App Router), TypeScript, Tailwind CSS
