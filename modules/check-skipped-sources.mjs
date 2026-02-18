#!/usr/bin/env node
/**
 * For each code in _skipped.txt, look up d2data (weapons/armor/misc) and report
 * whether the item exists in game data and what graphic fallbacks (invfile,
 * alternategfx) we have. Helps answer: "Do these items exist in the game?"
 * and "What gfx codes could we try for icons?"
 *
 * Writes: frontend/public/item-images/_skipped_sources.txt
 *
 * Usage: node check-skipped-sources.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "frontend", "public", "data");
const ITEM_IMAGES = path.join(__dirname, "frontend", "public", "item-images");
const SKIPPED_FILE = path.join(ITEM_IMAGES, "_skipped.txt");
const SOURCES_FILE = path.join(ITEM_IMAGES, "_skipped_sources.txt");

const D2DATA_URLS = {
  weapons: "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/weapons.json",
  armor: "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/armor.json",
  misc: "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/misc.json",
};

const CATALOG_FILES = [
  { file: "catalog.bases.json", name: "bases" },
  { file: "catalog.sets.json", name: "sets" },
  { file: "catalog.uniques.json", name: "uniques" },
  { file: "catalog.gems.json", name: "gems" },
  { file: "catalog.potions.json", name: "potions" },
  { file: "catalog.quest.json", name: "quest" },
];

async function loadD2Data() {
  const byCode = new Map();
  for (const [source, url] of Object.entries(D2DATA_URLS)) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "D2R-LootFilter-Builder/1.0" } });
      if (!res.ok) continue;
      const data = await res.json();
      for (const [code, row] of Object.entries(data)) {
        if (row && typeof row === "object") byCode.set(code, { ...row, _source: source });
      }
    } catch (e) {
      console.warn("Failed to fetch", source, e.message);
    }
  }
  return byCode;
}

async function buildCodeToLabel() {
  const map = new Map();
  for (const { file, name } of CATALOG_FILES) {
    const p = path.join(DATA_DIR, file);
    try {
      const raw = await fs.readFile(p, "utf-8");
      const data = JSON.parse(raw);
      const entries = data?.entries ?? data?.items ?? [];
      for (const e of entries) {
        if (e?.kind === "header") continue;
        const code = e?.code;
        if (!code) continue;
        const codes = Array.isArray(code) ? code : [code];
        const label = e?.label ?? e?.name ?? codes[0];
        for (const c of codes) {
          if (c && !map.has(c)) map.set(c, { label: String(label), catalog: name });
        }
      }
    } catch (err) {
      console.warn("Skip", file, err.message);
    }
  }
  return map;
}

function invToGfx(invfile) {
  if (!invfile || typeof invfile !== "string") return null;
  const s = invfile.toLowerCase();
  return s.startsWith("inv") ? s.slice(3) : invfile;
}

async function main() {
  let skipped;
  try {
    const raw = await fs.readFile(SKIPPED_FILE, "utf-8");
    skipped = raw.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith("#"));
  } catch (e) {
    console.error("Could not read", SKIPPED_FILE, e.message);
    process.exit(1);
  }

  const [d2data, codeToLabel] = await Promise.all([loadD2Data(), buildCodeToLabel()]);

  const lines = [
    "# Skipped codes: do they exist in game (d2data) and what gfx fallbacks do we have?",
    "# ItemScreenshot uses assets/gfx/{code}/0.png; many D2R/expansion items have no gfx there.",
    "",
    "code\tlabel\tcatalog\tin_d2data\tinvfile\tgfx_from_inv\talternategfx\tnotes",
    "---\t---\t---\t---\t---\t---\t---\t---",
  ];

  for (const code of skipped) {
    const info = codeToLabel.get(code) ?? { label: "(unknown)", catalog: "?" };
    const row = d2data.get(code);
    const inD2 = row ? "yes" : "no";
    const invfile = row?.invfile ?? "";
    const gfxFromInv = invfile ? invToGfx(invfile) : "";
    const altGfx = row?.alternategfx ?? "";
    const expansion = row?.expansion ? "D2R/expansion" : "";
    const notes = [
      expansion,
      !row ? "not in d2data (weapons/armor/misc)" : "in game data; no icon in ItemScreenshot",
    ].filter(Boolean).join("; ") || "—";
    lines.push(
      [code, info.label, info.catalog, inD2, invfile, gfxFromInv, altGfx, notes].join("\t")
    );
  }

  await fs.writeFile(SOURCES_FILE, lines.join("\n"), "utf-8");
  console.log("Wrote", SOURCES_FILE, "with", skipped.length, "entries.");
  const inGame = skipped.filter((c) => d2data.has(c)).length;
  console.log("In d2data (exist in game):", inGame, "/", skipped.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
