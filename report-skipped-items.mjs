#!/usr/bin/env node
/**
 * Read _skipped.txt and catalog JSONs, write _skipped_report.txt with:
 *   code | label | catalog
 * so you can find each missing item for debugging or manual asset lookup.
 *
 * Usage: node report-skipped-items.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "frontend", "public", "data");
const ITEM_IMAGES = path.join(__dirname, "frontend", "public", "item-images");
const SKIPPED_FILE = path.join(ITEM_IMAGES, "_skipped.txt");
const REPORT_FILE = path.join(ITEM_IMAGES, "_skipped_report.txt");

const CATALOG_FILES = [
  { file: "catalog.bases.json", name: "bases" },
  { file: "catalog.sets.json", name: "sets" },
  { file: "catalog.uniques.json", name: "uniques" },
  { file: "catalog.gems.json", name: "gems" },
  { file: "catalog.potions.json", name: "potions" },
  { file: "catalog.quest.json", name: "quest" },
];

/** Build map: code -> { label, catalog } from all catalogs */
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

async function main() {
  let skipped;
  try {
    const raw = await fs.readFile(SKIPPED_FILE, "utf-8");
    skipped = raw.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith("#"));
  } catch (e) {
    console.error("Could not read", SKIPPED_FILE, e.message);
    process.exit(1);
  }
  const codeToLabel = await buildCodeToLabel();
  const lines = ["code\tlabel\tcatalog", "---\t---\t---"];
  for (const code of skipped) {
    const info = codeToLabel.get(code) ?? { label: "(unknown)", catalog: "?" };
    lines.push(`${code}\t${info.label}\t${info.catalog}`);
  }
  await fs.writeFile(REPORT_FILE, lines.join("\n"), "utf-8");
  console.log("Wrote", REPORT_FILE, "with", skipped.length, "entries.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
