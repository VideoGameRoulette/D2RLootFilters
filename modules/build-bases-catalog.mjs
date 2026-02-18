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

const GEM_LABELS = /Sapphire|Emerald|Ruby|Topaz|Amethyst|Diamond|Skull/i;
const GEM_CODES = new Set(["cjw"]); // Colossal Jewel

function isGem(row) {
  const name = row?.name ?? "";
  if (GEM_LABELS.test(name)) return true;
  if (GEM_CODES.has(row?.code)) return true;
  return false;
}

function isPotion(row) {
  const name = row?.name ?? "";
  return /Potion/i.test(name);
}

/** Quest codes - excludes aqv, cqv, ear, gld (arrows, bolts, ear, gold - stay in Misc) */
const QUEST_CODES = new Set([
  "bks", "bkd", "bbb", "g33", "g34", "box", "key", "hst", "xyz", "j34",
  "bet", "ceh", "fed", "tes", "dhn", "bey", "brz", "eyz", "fng", "mbr", "qbr", "qey", "hrn",
  "0sc", "ass", "tr1", "tr2", "pk1", "pk2", "pk3", "luv", "flg",
  "mss", "ice", "cs2", "elx", "hrb", "hrt", "jaw", "qhr", "qll", "scz", "sol", "spe", "std", "tal", "tch", "toa",
  "ua1", "ua2", "ua3", "ua4", "ua5", "um1", "um2", "um3", "um4", "um5", "um6",
  "xa1", "xa2", "xa3", "xa4", "xa5",
]);

function isQuest(row) {
  return QUEST_CODES.has(row?.code ?? "");
}

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

/** Derive equipment quality (normal/exceptional/elite) from d2data normcode/ubercode/ultracode. */
function equipmentQuality(row) {
  const code = row?.code;
  const norm = row?.normcode;
  const uber = row?.ubercode;
  const ultra = row?.ultracode;
  if (code == null) return "normal";
  if (code === ultra) return "elite";
  if (code === uber) return "exceptional";
  if (code === norm) return "normal";
  return "normal";
}

function toFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function damageRange(minRaw, maxRaw) {
  const min = toFiniteNumber(minRaw);
  const max = toFiniteNumber(maxRaw);
  if (min == null || max == null) return undefined;
  if (min <= 0 && max <= 0) return undefined;
  return { min, max };
}

function armorWeightClass(row, slot) {
  const armorSlots = new Set(["Helm", "Armor", "Shield", "Gloves", "Belt", "Boots"]);
  if (!armorSlots.has(slot)) return undefined;
  const speed = toFiniteNumber(row?.speed);
  if (speed == null) return undefined;
  if (speed >= 10) return "heavy";
  if (speed >= 5) return "medium";
  return "light";
}

function extractBaseStats(source, row, slot) {
  const stats = {};

  const minDefense = toFiniteNumber(row?.minac);
  const maxDefense = toFiniteNumber(row?.maxac);
  if (minDefense != null && maxDefense != null && (minDefense > 0 || maxDefense > 0)) {
    stats.minDefense = minDefense;
    stats.maxDefense = maxDefense;
  }

  if (source === "weapons") {
    const oneHandDamage = damageRange(row?.mindam, row?.maxdam);
    if (oneHandDamage) stats.oneHandDamage = oneHandDamage;
    const twoHandDamage = damageRange(row?.["2handmindam"], row?.["2handmaxdam"]);
    if (twoHandDamage) stats.twoHandDamage = twoHandDamage;
  }

  const maxSockets = toFiniteNumber(row?.gemsockets);
  if (maxSockets != null && maxSockets > 0) {
    stats.maxSockets = maxSockets;
  }

  if (source === "armor") {
    const weightClass = armorWeightClass(row, slot);
    if (weightClass) stats.armorWeightClass = weightClass;
  }

  const requiredStrength = toFiniteNumber(row?.reqstr);
  if (requiredStrength != null && requiredStrength > 0) {
    stats.requiredStrength = requiredStrength;
  }
  const requiredDexterity = toFiniteNumber(row?.reqdex);
  if (requiredDexterity != null && requiredDexterity > 0) {
    stats.requiredDexterity = requiredDexterity;
  }
  const requiredLevel = toFiniteNumber(row?.levelreq);
  if (requiredLevel != null && requiredLevel > 0) {
    stats.requiredLevel = requiredLevel;
  }

  return stats;
}

function buildEntries(armor, weapons, misc) {
  const bySlot = new Map();
  const add = (source, objMap) => {
    for (const [code, row] of Object.entries(objMap)) {
      const name = row?.name;
      if (!name || !code) continue;
      if (source === "misc" && isGem(row)) continue; // Gems go in catalog.gems.json
      if (source === "misc" && isPotion(row)) continue; // Potions go in catalog.potions.json
      if (source === "misc" && isQuest(row)) continue; // Quest items go in catalog.quest.json
      const slot = slotFromType(source, row?.type);
      if (!bySlot.has(slot)) bySlot.set(slot, []);
      const quality = source === "misc" ? "normal" : equipmentQuality(row);
      const stats = extractBaseStats(source, row, slot);
      bySlot
        .get(slot)
        .push({ code, label: (name ?? "").trim(), slot, quality, ...stats });
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
