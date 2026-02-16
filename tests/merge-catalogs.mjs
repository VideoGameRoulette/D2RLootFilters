#!/usr/bin/env node
/**
 * Merge catalog.sets.json and catalog.uniques.json into catalog.json.
 * Outputs a canonical catalog: every entry is normalized to the exact shape
 * build-filter.mjs expects (no extra keys like slot, baseName, source).
 *
 * For in-game use you can build from this merged catalog, or build two filters and merge:
 *   node build-filter.mjs catalog.sets.json lootfilter-set.json "Sets"
 *   node build-filter.mjs catalog.uniques.json lootfilter-unique.json "Uniques"
 *
 * Usage: node merge-catalogs.mjs [catalog.json]
 */

import fs from "node:fs/promises";
import process from "node:process";

/**
 * Normalize one catalog entry to canonical form (only keys build-filter uses).
 * Returns { type, label } for headers; { type, rarity, label, code, enabled } for items;
 * { type, rarity, label, codes, enabled } for bundles.
 */
function normalizeEntry(e, index) {
  if (!e || typeof e !== "object") {
    throw new Error(`Invalid entry at index ${index}: not an object`);
  }

  if (e.type === "header" || e.kind === "header") {
    return {
      type: "header",
      label: String(e.label ?? e.name ?? "").trim(),
    };
  }

  const rarity = e.rarity;
  const label = String(e.label ?? e.name ?? "").trim();
  const enabled = e.enabled === true;

  if (typeof e.code === "string") {
    if (!rarity || !label) {
      throw new Error(`Entry at index ${index}: item missing rarity or label`);
    }
    return { type: "item", rarity, label, code: e.code, enabled };
  }

  if (Array.isArray(e.code) && e.code.length > 0) {
    if (!rarity || !label) {
      throw new Error(`Entry at index ${index}: bundle missing rarity or label`);
    }
    return { type: "bundle", rarity, label, codes: e.code, enabled };
  }

  throw new Error(
    `Entry at index ${index}: unknown shape (need kind/type header, or code string/array): ${JSON.stringify(e).slice(0, 100)}`
  );
}

async function main() {
  const outPath = process.argv[2] ?? "catalog.json";

  const [setsData, uniquesData] = await Promise.all([
    fs.readFile("catalog.sets.json", "utf8").then(JSON.parse),
    fs.readFile("catalog.uniques.json", "utf8").then(JSON.parse),
  ]);

  const setEntries = Array.isArray(setsData.entries) ? setsData.entries : [];
  const uniqueEntries = Array.isArray(uniquesData.entries) ? uniquesData.entries : [];

  const rawMerged = [...setEntries, ...uniqueEntries];
  const entries = rawMerged.map((e, i) => normalizeEntry(e, i));

  const catalog = {
    name: "Set + Unique Catalog",
    generatedAt: new Date().toISOString(),
    source: {
      sets: "catalog.sets.json",
      uniques: "catalog.uniques.json",
    },
    entries,
  };

  await fs.writeFile(outPath, JSON.stringify(catalog, null, 2), "utf8");
  const itemCount = entries.filter((e) => e.type === "item" || e.type === "bundle").length;
  console.log(
    `Wrote ${outPath}: ${entries.length} entries (${itemCount} rules), canonical shape only.`
  );
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
