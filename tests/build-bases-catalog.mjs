#!/usr/bin/env node
/**
 * Build a catalog of all base items (armor, weapons, misc) for Normal/Magic/Rare selection.
 * Fetches from d2data: armor.json, weapons.json, misc.json.
 * Output: catalog.bases.json with entries grouped by slot (Helm, Armor, Weapon, etc.).
 *
 * Usage: node build-bases-catalog.mjs [catalog.bases.json]
 */

import fs from "node:fs/promises";
import process from "node:process";

const URL_ARMOR =
  "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/armor.json";
const URL_WEAPONS =
  "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/weapons.json";
const URL_MISC =
  "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/misc.json";

const SLOT_ORDER = [
  "Helm",
  "Armor",
  "Weapon",
  "Shield",
  "Gloves",
  "Belt",
  "Boots",
  "Ring",
  "Amulet",
  "Charm",
  "Other",
];

function slotFromType(source, type) {
  const t = (type ?? "").toLowerCase();
  if (source === "weapons") return "Weapon";
  if (t === "ring") return "Ring";
  if (t === "amul" || t === "amulet") return "Amulet";
  if (t === "char" || t === "charm") return "Charm";
  if (t === "belt") return "Belt";
  if (t === "boot") return "Boots";
  if (t === "glov") return "Gloves";
  if (t === "tors") return "Armor";
  if (t === "helm" || t === "circ" || t === "pelt" || t === "phlm") return "Helm";
  if (t === "shie" || t === "ashd" || t === "shld" || t === "pash" || t === "head")
    return "Shield";
  if (source === "armor") return "Armor";
  return "Other";
}

function buildEntries(armor, weapons, misc) {
  const bySlot = new Map();
  const add = (source, objMap) => {
    for (const [code, row] of Object.entries(objMap)) {
      const name = row?.name;
      if (!name || !code) continue;
      const slot = slotFromType(source, row?.type);
      if (!bySlot.has(slot)) bySlot.set(slot, []);
      bySlot.get(slot).push({ code, label: (name ?? "").trim(), slot });
    }
  };
  add("armor", armor);
  add("weapons", weapons);
  add("misc", misc);

  const entries = [];
  for (const slot of SLOT_ORDER) {
    const items = bySlot.get(slot);
    if (!items?.length) continue;
    entries.push({ kind: "header", label: slot });
    for (const it of items) entries.push(it);
  }
  return entries;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "d2r-lootfilter-catalog/1.0" },
  });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function main() {
  const outPath = process.argv[2] ?? "catalog.bases.json";
  const [armor, weapons, misc] = await Promise.all([
    fetchJson(URL_ARMOR),
    fetchJson(URL_WEAPONS),
    fetchJson(URL_MISC),
  ]);
  const entries = buildEntries(armor, weapons, misc);
  const catalog = {
    name: "Bases Catalog",
    generatedAt: new Date().toISOString(),
    source: { armor: URL_ARMOR, weapons: URL_WEAPONS, misc: URL_MISC },
    entries,
  };
  await fs.writeFile(outPath, JSON.stringify(catalog, null, 2), "utf8");
  const itemCount = entries.filter((e) => !e.kind).length;
  const slotCount = entries.filter((e) => e.kind === "header").length;
  console.log(`Wrote ${outPath}: ${itemCount} base items in ${slotCount} slots`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
