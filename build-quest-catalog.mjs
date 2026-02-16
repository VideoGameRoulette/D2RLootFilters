#!/usr/bin/env node
/**
 * Build a catalog of all quest items for the Quest panel.
 * Fetches from d2data: misc.json and filters quest items (scrolls, keys, cube, essences, organs, tomes, etc.).
 * Output: catalog.quest.json
 *
 * Usage: node build-quest-catalog.mjs [catalog.quest.json]
 */

import fs from "node:fs/promises";
import process from "node:process";

const URL_MISC =
  "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/misc.json";

/** Quest item codes from D2. Excludes: aqv (arrows), cqv (bolts), ear (ear), gld (gold). */
const QUEST_CODES = new Set([
  "bks", "bkd", "bbb", "g33", "g34", "box", "key", "hst", "xyz", "j34",
  "bet", "ceh", "fed", "tes", "dhn", "bey", "brz", "eyz", "fng", "mbr", "qbr", "qey", "hrn",
  "0sc", "ass", "isc", "tsc", "tr1", "tr2", "tbk", "ibk", "pk1", "pk2", "pk3", "luv", "flg",
  "mss", "ice", "cs2", "elx", "hrb", "hrt", "jaw", "qhr", "qll", "scz", "sol", "spe", "std", "tal", "tch", "toa",
  "ua1", "ua2", "ua3", "ua4", "ua5", "um1", "um2", "um3", "um4", "um5", "um6",
  "xa1", "xa2", "xa3", "xa4", "xa5",
]);

/** Category order - Act quests with names, then Uber/General/Endgame */
const QUEST_CATEGORIES = [
  { label: "Act 1 - The Search for Cain", codes: ["bks", "bkd", "luv", "0sc"] },
  { label: "Act 1 - The Forgotten Tower", codes: ["key"] },
  { label: "Act 2 - Radament's Lair", codes: ["ass", "tr1"] },
  { label: "Act 2 - The Horadric Staff", codes: ["box"] },
  { label: "Act 3 - Blade of the Old Religion", codes: ["g33"] },
  { label: "Act 3 - Lam Esen's Tome", codes: ["bbb"] },
  { label: "Act 3 - The Golden Bird", codes: ["g34", "j34", "xyz"] },
  { label: "Act 3 - Khalim's Will", codes: ["qhr", "qll", "jaw", "hrt", "qey", "brz"] },
  { label: "Act 3 - The Guardian", codes: ["mss"] },
  { label: "Act 4 - Terror's End", codes: ["bet", "ceh", "fed", "tes"] },
  { label: "Act 5 - Rescue on Mount Arreat", codes: ["ice"] },
  { label: "Act 5 - Betrayal of Harrogath", codes: ["scz", "sol", "spe", "tal"] },
  { label: "Act 5 - Prison of Ice", codes: ["tr2"] },
  { label: "Act 5 - Eve of Destruction", codes: ["xa1", "xa2", "xa3", "xa4", "xa5", "std"] },
  { label: "Act 5 - Pandemonium Event", codes: ["eyz", "fng", "qbr", "hrn"] },
  { label: "Uber Tristram - Keys", codes: ["pk1", "pk2", "pk3"] },
  { label: "Uber Tristram - Cube Recipe", codes: ["dhn", "bey", "mbr"] },
  { label: "General (Identify / Town Portal)", codes: ["isc", "tsc", "tbk", "ibk", "flg"] },
  { label: "Endgame & Crafted", codes: ["cs2", "tch", "toa", "elx", "hrb", "ua1", "ua2", "ua3", "ua4", "ua5", "um1", "um2", "um3", "um4", "um5", "um6"] },
];

const CODE_TO_CATEGORY = new Map();
for (const cat of QUEST_CATEGORIES) {
  for (const code of cat.codes) {
    CODE_TO_CATEGORY.set(code, cat.label);
  }
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "d2r-lootfilter-catalog/1.0" },
  });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function main() {
  const outPath = process.argv[2] ?? "catalog.quest.json";
  const misc = await fetchJson(URL_MISC);

  const byCategory = new Map();
  for (const [code, row] of Object.entries(misc)) {
    if (!QUEST_CODES.has(code)) continue;
    const name = row?.name;
    if (!name || !code) continue;
    const category = CODE_TO_CATEGORY.get(code) ?? "Other Quest";
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push({ code, label: name.trim(), slot: "Other" });
  }

  // Sort items within each category alphabetically
  for (const items of byCategory.values()) {
    items.sort((a, b) => (a.label ?? "").localeCompare(b.label ?? ""));
  }

  const entries = [];
  for (const cat of QUEST_CATEGORIES) {
    const items = byCategory.get(cat.label);
    if (!items?.length) continue;
    entries.push({ kind: "header", label: cat.label });
    for (const it of items) entries.push(it);
  }

  const catalog = {
    name: "Quest Catalog",
    generatedAt: new Date().toISOString(),
    source: { misc: URL_MISC },
    entries,
  };
  await fs.writeFile(outPath, JSON.stringify(catalog, null, 2), "utf8");
  const count = entries.filter((e) => "code" in e).length;
  const headerCount = entries.filter((e) => e.kind === "header").length;
  console.log(`Wrote ${outPath}: ${count} quest items in ${headerCount} categories`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
