#!/usr/bin/env node
/**
 * Copy catalog JSON from repo root into frontend/public/data so the Next.js app can load them.
 * Run from frontend/: node copy-catalogs.mjs
 * Or from root: node frontend/copy-catalogs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname);
const rootDir = path.resolve(frontendDir, "..");
const outDir = path.join(frontendDir, "public", "data");

const files = [
  "catalog.sets.json",
  "catalog.uniques.json",
  "catalog.bases.json",
  "catalog.gems.json",
  "catalog.potions.json",
  "catalog.quest.json",
];

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (const name of files) {
  const src = path.join(rootDir, name);
  const dest = path.join(outDir, name);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${name} -> public/data/`);
  } else {
    console.warn(`Skip ${name} (not found at ${src})`);
  }
}
