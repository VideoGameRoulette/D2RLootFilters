#!/usr/bin/env node
/**
 * Build a Unique-items catalog for a D2R loot-filter builder.
 *
 * Sources:
 * - Unique names + base item codes: https://raw.githubusercontent.com/blizzhackers/d2data/master/json/uniqueitems.json
 * - Base item type/slot: https://raw.githubusercontent.com/blizzhackers/d2data/master/json/{armor,weapons,misc}.json
 *
 * Output: JSON with entries (optional headers by slot + one entry per unique).
 * Same entry shape as set catalog so build-filter.mjs can consume it.
 *
 * Usage:
 *   node build-uniques-catalog.mjs [catalog.uniques.json]
 */

import fs from "node:fs/promises";
import process from "node:process";

const URL_UNIQUEITEMS =
  "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/uniqueitems.json";
const URL_ARMOR =
  "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/armor.json";
const URL_WEAPONS =
  "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/weapons.json";
const URL_MISC =
  "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/misc.json";

const MAX_LABEL = 32;

function clean(s) {
  return (s ?? "").replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

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

/** Label: unique name only (no "U " prefix). */
function uniqueLabel(uniqueName) {
  let label = clean(uniqueName);
  if (label.length <= MAX_LABEL) return label;
  return label.slice(0, MAX_LABEL);
}

function buildBaseCodeIndex({ armor, weapons, misc }) {
  const idx = new Map();
  const add = (source, objMap) => {
    for (const [code, row] of Object.entries(objMap)) {
      const name = row?.name;
      if (!name || !code) continue;
      if (!idx.has(code)) {
        idx.set(code, {
          code,
          type: row?.type ?? null,
          source,
          name,
        });
      }
    }
  };
  add("armor", armor);
  add("weapons", weapons);
  add("misc", misc);
  return idx;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "VGRoulette-catalog-builder/1.0" },
  });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status} ${res.statusText}`);
  return res.json();
}

/** Slot order for section headers. */
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

function buildCatalogEntries(uniqueItems, baseIdx) {
  const bySlot = new Map();
  const missing = [];

  for (const [, row] of Object.entries(uniqueItems)) {
    if (!row || typeof row !== "object") continue;
    const uniqueName = row.index ?? row["*index"];
    const code = row.code;
    if (!uniqueName || !code) continue;
    // Optional: skip non-spawnable (e.g. Azurewrath has spawnable: 0)
    if (row.spawnable === 0 && !row.disableChronicle) continue;

    const base = baseIdx.get(code);
    if (!base) {
      missing.push({ uniqueName, code });
      continue;
    }

    const slot = slotFromType(base.source, base.type);
    const label = uniqueLabel(uniqueName);

    const entry = {
      rarity: "unique",
      label,
      code,
      enabled: false,
      slot,
      baseName: base.name,
      baseType: base.type,
      source: base.source,
    };

    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot).push(entry);
  }

  const entries = [];
  for (const slot of SLOT_ORDER) {
    const items = bySlot.get(slot);
    if (!items?.length) continue;
    entries.push({
      kind: "header",
      label: `Unique ${slot}s`,
      enabled: false,
    });
    for (const e of items) entries.push(e);
  }
  // Any slot not in SLOT_ORDER
  for (const [slot, items] of bySlot) {
    if (SLOT_ORDER.includes(slot)) continue;
    entries.push({ kind: "header", label: `Unique ${slot}`, enabled: false });
    for (const e of items) entries.push(e);
  }

  return { entries, missing };
}

async function main() {
  const outPath = process.argv[2] || null;

  const [uniqueItems, armor, weapons, misc] = await Promise.all([
    fetchJson(URL_UNIQUEITEMS),
    fetchJson(URL_ARMOR),
    fetchJson(URL_WEAPONS),
    fetchJson(URL_MISC),
  ]);

  const baseIdx = buildBaseCodeIndex({ armor, weapons, misc });
  const { entries, missing } = buildCatalogEntries(uniqueItems, baseIdx);

  const payload = {
    name: "Unique Catalog",
    generatedAt: new Date().toISOString(),
    source: {
      uniqueitems: URL_UNIQUEITEMS,
      d2data: [URL_ARMOR, URL_WEAPONS, URL_MISC],
    },
    entries,
    missing,
  };

  const json = JSON.stringify(payload, null, 2);
  if (outPath) {
    await fs.writeFile(outPath, json, "utf8");
    console.error(`Wrote ${outPath}`);
  } else {
    process.stdout.write(json);
  }
  console.error(
    `Uniques: ${entries.filter((e) => e.rarity === "unique").length}. Missing base codes: ${missing.length}`
  );
  if (missing.length > 0 && missing.length <= 30) {
    console.error("Missing (code not in armor/weapons/misc):");
    for (const m of missing) console.error(`  ${m.uniqueName} -> ${m.code}`);
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
