#!/usr/bin/env node
/**
 * Parse Maxroll valuable-unique-set-items page HTML to get (item name -> d2planner id),
 * then add maxrollId to catalog.uniques.json and catalog.sets.json entries by matching label.
 *
 * Expects frontend/public/item-unique/_page.html (or item-set/_page.html) to contain the table
 * with <span class="d2planner-item" data-d2planner-id="unique381">Annihilus</span>.
 *
 * Usage: node merge-maxroll-into-catalogs.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, "frontend", "public", "data");
const UNIQUES_CATALOG = path.join(DATA_DIR, "catalog.uniques.json");
const SETS_CATALOG = path.join(DATA_DIR, "catalog.sets.json");

// Try both possible HTML locations (same page content)
const HTML_CANDIDATES = [
  path.join(__dirname, "frontend", "public", "item-unique", "_page.html"),
  path.join(__dirname, "frontend", "public", "item-set", "_page.html"),
];

/** Decode HTML entities in text extracted from Maxroll HTML (e.g. &#x27; -> ', &quot; -> "). */
function decodeHtmlEntities(s) {
  if (!s || typeof s !== "string") return s;
  return s
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#x22;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&#x26;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

/** Normalize label for matching: lowercase, trim, collapse spaces, normalize apostrophes */
function normalizeName(s) {
  return (s ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\u2018\u2019\u201a]/g, "'")
    .replace(/\u00a0/g, " ");
}

/** Known catalog label -> Maxroll name (typos or slight differences) */
const LABEL_ALIASES = {
  "peasent crown": "peasant crown",
  "tal rasha's fine-spun cloth": "tal rasha's fine-spun cloth", // same
  "seraph's hymn": "seraph's hymn",
};

function resolveName(normalized) {
  return LABEL_ALIASES[normalized] ?? normalized;
}

async function findHtml() {
  for (const p of HTML_CANDIDATES) {
    try {
      await fs.access(p);
      return p;
    } catch {
      continue;
    }
  }
  throw new Error("No _page.html found in item-unique/ or item-set/");
}

/** Extract (id, name) pairs from HTML. Id is "unique381" or "set042". */
function extractNameToId(html) {
  const map = new Map();
  const regex = /data-d2planner-id="(unique\d+|set\d+)">([^<]+)<\/span>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const id = m[1].toLowerCase();
    const rawName = m[2].replace(/\s+/g, " ").trim();
    const name = decodeHtmlEntities(rawName);
    const key = normalizeName(name);
    if (!key) continue;
    map.set(key, id);
  }
  return map;
}

function addMaxrollIdsToCatalog(entries, nameToId, idPrefix) {
  let added = 0;
  const out = [];
  for (const e of entries) {
    const entry = { ...e };
    if (entry.kind === "header" || !entry.label) {
      out.push(entry);
      continue;
    }
    const normalized = normalizeName(entry.label);
    const resolved = resolveName(normalized);
    const id = nameToId.get(resolved) ?? nameToId.get(normalized);
    if (id && id.startsWith(idPrefix)) {
      entry.maxrollId = id;
      added++;
    }
    out.push(entry);
  }
  return { entries: out, added };
}

async function main() {
  const htmlPath = await findHtml();
  console.log("Using HTML:", htmlPath);
  const html = await fs.readFile(htmlPath, "utf-8");
  const nameToId = extractNameToId(html);

  const uniqueCount = [...nameToId.values()].filter((v) => v.startsWith("unique")).length;
  const setCount = [...nameToId.values()].filter((v) => v.startsWith("set")).length;
  console.log("Extracted from HTML: uniques", uniqueCount, ", sets", setCount);

  const uniquesCatalog = JSON.parse(await fs.readFile(UNIQUES_CATALOG, "utf-8"));
  const setsCatalog = JSON.parse(await fs.readFile(SETS_CATALOG, "utf-8"));

  const uniquesResult = addMaxrollIdsToCatalog(uniquesCatalog.entries, nameToId, "unique");
  const setsResult = addMaxrollIdsToCatalog(setsCatalog.entries, nameToId, "set");

  uniquesCatalog.entries = uniquesResult.entries;
  setsCatalog.entries = setsResult.entries;

  await fs.writeFile(
    UNIQUES_CATALOG,
    JSON.stringify(uniquesCatalog, null, 2),
    "utf-8"
  );
  await fs.writeFile(
    SETS_CATALOG,
    JSON.stringify(setsCatalog, null, 2),
    "utf-8"
  );

  console.log("Uniques: added maxrollId to", uniquesResult.added, "entries");
  console.log("Sets: added maxrollId to", setsResult.added, "entries");
  console.log("Wrote", UNIQUES_CATALOG, "and", SETS_CATALOG);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
