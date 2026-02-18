#!/usr/bin/env node
/**
 * Build a catalog of all potion items for the Potions panel.
 * Fetches from d2data: misc.json and filters potions.
 * Categories: Health, Mana, Rejuvenation, Misc Potions
 *
 * Usage: node build-potions-catalog.mjs [catalog.potions.json]
 */

import fs from "node:fs/promises";
import process from "node:process";

const URL_MISC =
  "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/misc.json";

/** Potion category order */
const POTION_CATEGORY_ORDER = [
  "Health Potions",
  "Mana Potions",
  "Rejuvenation Potions",
  "Misc Potions",
];

const HEALTH_LABELS = /Healing|Red Potion|Malah/i;
const MANA_LABELS = /Mana|Blue Potion/i;
const REJUV_LABELS = /Rejuvenation/i;

function isPotion(row) {
  const code = row?.code ?? "";
  if (code === "ice") return false; // Malah's Potion - quest item
  if (code === "xyz") return false; // Potion of Life - quest item
  const name = row?.name ?? "";
  if (!/Potion/i.test(name)) return false;
  return true;
}

function getPotionCategory(label) {
  const l = String(label ?? "");
  if (REJUV_LABELS.test(l)) return "Rejuvenation Potions";
  if (HEALTH_LABELS.test(l)) return "Health Potions";
  if (MANA_LABELS.test(l)) return "Mana Potions";
  return "Misc Potions";
}

/** Sort order within Health: Minor < Light < Healing < Greater < Super < Full < Malah, then Red potions */
const HEALTH_SORT = [
  "Minor",
  "Light",
  "Healing",
  "Greater",
  "Super",
  "Full",
  "Malah",
  "Small Red",
  "Large Red",
];
const MANA_SORT = [
  "Minor",
  "Light",
  "Mana",
  "Greater",
  "Super",
  "Full",
  "Small Blue",
  "Large Blue",
];
const REJUV_SORT = ["Rejuvenation", "Full Rejuvenation"];
const MISC_SORT = (a, b) => (a.label ?? "").localeCompare(b.label ?? "");

function sortKey(item) {
  const cat = item.category;
  const l = (item.label ?? "").toLowerCase();
  if (cat === "Health Potions") {
    for (let i = 0; i < HEALTH_SORT.length; i++) {
      if (l.startsWith(HEALTH_SORT[i].toLowerCase())) return i;
    }
    return HEALTH_SORT.length;
  }
  if (cat === "Mana Potions") {
    for (let i = 0; i < MANA_SORT.length; i++) {
      if (l.startsWith(MANA_SORT[i].toLowerCase())) return i;
    }
    return MANA_SORT.length;
  }
  if (cat === "Rejuvenation Potions") {
    for (let i = 0; i < REJUV_SORT.length; i++) {
      if (l.includes(REJUV_SORT[i].toLowerCase())) return i;
    }
    return REJUV_SORT.length;
  }
  return 0;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "d2r-lootfilter-catalog/1.0" },
  });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function main() {
  const outPath = process.argv[2] ?? "catalog.potions.json";
  const misc = await fetchJson(URL_MISC);

  const raw = [];
  for (const [code, row] of Object.entries(misc)) {
    if (!isPotion(row)) continue;
    const name = row?.name;
    if (!name || !code) continue;
    const label = name.trim();
    const category = getPotionCategory(label);
    raw.push({ code, label, slot: "Other", category });
  }

  raw.sort((a, b) => {
    const catA = POTION_CATEGORY_ORDER.indexOf(a.category);
    const catB = POTION_CATEGORY_ORDER.indexOf(b.category);
    if (catA !== catB) return catA - catB;
    const keyA = sortKey(a);
    const keyB = sortKey(b);
    if (keyA !== keyB) return keyA - keyB;
    return (a.label ?? "").localeCompare(b.label ?? "");
  });

  const entries = [];
  let lastCategory = null;
  for (const item of raw) {
    if (item.category !== lastCategory) {
      entries.push({ kind: "header", label: item.category });
      lastCategory = item.category;
    }
    entries.push({ code: item.code, label: item.label, slot: item.slot });
  }

  const catalog = {
    name: "Potions Catalog",
    generatedAt: new Date().toISOString(),
    source: { misc: URL_MISC },
    entries,
  };
  await fs.writeFile(outPath, JSON.stringify(catalog, null, 2), "utf8");
  const count = entries.filter((e) => "code" in e).length;
  const headerCount = entries.filter((e) => e.kind === "header").length;
  console.log(`Wrote ${outPath}: ${count} potions in ${headerCount} categories`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
