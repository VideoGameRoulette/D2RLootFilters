#!/usr/bin/env node
/**
 * Build a catalog of all gem items for the Gems panel.
 * Fetches from d2data: misc.json and filters gem items (Sapphire, Emerald, Ruby, Topaz, Amethyst, Diamond, Skull, Colossal Jewel).
 * Output: catalog.gems.json
 *
 * Usage: node build-gems-catalog.mjs [catalog.gems.json]
 */

import fs from "node:fs/promises";
import process from "node:process";

const URL_MISC =
  "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/misc.json";

const GEM_LABELS = /Sapphire|Emerald|Ruby|Topaz|Amethyst|Diamond|Skull/i;

/** Gem type order (user preference: Amethyst, Topaz at top). Colossal Jewel excluded - belongs in Magic/Rare. */
const GEM_TYPE_ORDER = ["Amethyst", "Topaz", "Sapphire", "Emerald", "Ruby", "Diamond", "Skull"];

/** Quality tier (lowest to highest) */
const QUALITY_ORDER = ["Chipped", "Flawed", "Flawless", null, "Perfect"];
// null = standard (e.g. "Sapphire" with no prefix)

function isGem(row) {
  const code = row?.code ?? "";
  if (code === "cjw") return false; // Colossal Jewel - belongs in Magic/Rare, not gems
  const name = row?.name ?? "";
  return GEM_LABELS.test(name);
}

function parseGem(label) {
  const l = String(label ?? "").trim();
  for (const quality of QUALITY_ORDER) {
    if (quality === null) {
      // Standard: label is just the type (Sapphire, Emerald, etc.)
      for (const type of GEM_TYPE_ORDER) {
        if (type === "Colossal Jewel") continue;
        if (l === type) return { type, quality: 3 }; // Standard = index 3
      }
      continue;
    }
    const prefix = quality + " ";
    if (l.startsWith(prefix)) {
      const rest = l.slice(prefix.length);
      return { type: rest, quality: QUALITY_ORDER.indexOf(quality) };
    }
  }
  return null;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "d2r-lootfilter-catalog/1.0" },
  });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function main() {
  const outPath = process.argv[2] ?? "catalog.gems.json";
  const misc = await fetchJson(URL_MISC);

  const raw = [];
  for (const [code, row] of Object.entries(misc)) {
    if (!isGem(row)) continue;
    const name = row?.name;
    if (!name || !code) continue;
    const label = name.trim();
    const parsed = parseGem(label);
    if (!parsed) continue;
    raw.push({ code, label, slot: "Other", ...parsed });
  }

  raw.sort((a, b) => {
    const typeA = GEM_TYPE_ORDER.indexOf(a.type);
    const typeB = GEM_TYPE_ORDER.indexOf(b.type);
    if (typeA !== typeB) return typeA - typeB;
    return a.quality - b.quality;
  });

  const entries = [];
  let lastType = null;
  for (const item of raw) {
    if (item.type !== lastType) {
      entries.push({ kind: "header", label: item.type });
      lastType = item.type;
    }
    entries.push({ code: item.code, label: item.label, slot: item.slot });
  }

  const catalog = {
    name: "Gems Catalog",
    generatedAt: new Date().toISOString(),
    source: { misc: URL_MISC },
    entries,
  };
  await fs.writeFile(outPath, JSON.stringify(catalog, null, 2), "utf8");
  const gemCount = entries.filter((e) => "code" in e).length;
  const headerCount = entries.filter((e) => e.kind === "header").length;
  console.log(`Wrote ${outPath}: ${gemCount} gems in ${headerCount} categories`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
