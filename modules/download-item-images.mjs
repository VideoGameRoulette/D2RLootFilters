#!/usr/bin/env node
/**
 * Collect all item codes from catalog JSONs and optionally download item images
 * into frontend/public/item-images/{code}.png.
 *
 * Open-source source (recommended):
 *   ITEM_IMAGE_BASE_URL=https://raw.githubusercontent.com/blizzhackers/ItemScreenshot/master/assets/gfx
 *   ITEM_IMAGE_PATH_SUFFIX=/0
 *   Fetches {base}/{code}/0.png (first frame of each item). MIT license, same org as d2data.
 *
 * Or set only ITEM_IMAGE_BASE_URL for flat {base}/{code}.png.
 *
 * Failed codes are written to item-images/_skipped.txt. To list them with label and catalog for debugging, run:
 *   node report-skipped-items.mjs
 * (produces item-images/_skipped_report.txt)
 *
 * Usage:
 *   node download-item-images.mjs
 *   ITEM_IMAGE_BASE_URL=https://... ITEM_IMAGE_PATH_SUFFIX=/0 node download-item-images.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root or frontend/ if present (no extra dependency)
async function loadEnv() {
  for (const p of [
    path.join(__dirname, ".env"),
    path.join(__dirname, "frontend", ".env"),
  ]) {
    try {
      const raw = await fs.readFile(p, "utf-8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      }
    } catch {
      /* ignore */
    }
  }
}

const DATA_DIR = path.join(__dirname, "frontend", "public", "data");
const OUT_DIR = path.join(__dirname, "frontend", "public", "item-images");
const DELAY_MS = 150;

const URL_WEAPONS = "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/weapons.json";
const URL_ARMOR = "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/armor.json";
const URL_MISC = "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/misc.json";

const CATALOG_FILES = [
  "catalog.bases.json",
  "catalog.sets.json",
  "catalog.uniques.json",
  "catalog.gems.json",
  "catalog.potions.json",
  "catalog.quest.json",
];

const RUNE_CODES = [];
for (let i = 1; i <= 33; i++) {
  RUNE_CODES.push("r" + String(i).padStart(2, "0"));
}

function extractCodesFromEntries(entries, includeImageCodes = false) {
  const codes = new Set();
  for (const e of entries ?? []) {
    if (e?.kind === "header") continue;
    const code = e?.code;
    if (!code) continue;
    if (Array.isArray(code)) code.forEach((c) => c && codes.add(String(c)));
    else codes.add(String(code));
    if (includeImageCodes && e?.imageCode) codes.add(String(e.imageCode));
  }
  return codes;
}

async function loadCatalogCodes() {
  const all = new Set();
  for (const file of CATALOG_FILES) {
    const p = path.join(DATA_DIR, file);
    try {
      const raw = await fs.readFile(p, "utf-8");
      const data = JSON.parse(raw);
      const entries = data?.entries ?? data?.items ?? [];
      const useImageCodes = file === "catalog.uniques.json";
      for (const c of extractCodesFromEntries(entries, useImageCodes)) all.add(c);
    } catch (err) {
      console.warn("Skip", file, err.message);
    }
  }
  RUNE_CODES.forEach((c) => all.add(c));
  return Array.from(all).sort();
}

async function downloadOne(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "D2R-LootFilter-Builder/1.0" },
    redirect: "follow",
  });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

/** Build code -> [fallback codes] from d2data (normcode, alternategfx, invfile). Used when primary URL 404s. */
async function buildFallbackMap() {
  const map = new Map();
  for (const url of [URL_WEAPONS, URL_ARMOR, URL_MISC]) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "D2R-LootFilter-Builder/1.0" } });
      if (!res.ok) continue;
      const data = await res.json();
      for (const [code, row] of Object.entries(data)) {
        if (!row || typeof row !== "object") continue;
        const fallbacks = [];
        if (row.normcode && row.normcode !== code) fallbacks.push(row.normcode);
        if (row.alternategfx && row.alternategfx !== code && !fallbacks.includes(row.alternategfx)) fallbacks.push(row.alternategfx);
        const invGfx = row.invfile && String(row.invfile).toLowerCase().startsWith("inv")
          ? String(row.invfile).slice(3)
          : null;
        if (invGfx && invGfx !== code && !fallbacks.includes(invGfx)) fallbacks.push(invGfx);
        if (fallbacks.length) map.set(code, fallbacks);
      }
    } catch {
      /* ignore */
    }
  }
  return map;
}

async function main() {
  await loadEnv();
  const baseUrl = process.env.ITEM_IMAGE_BASE_URL?.trim();
  const codes = await loadCatalogCodes();
  console.log("Collected", codes.length, "item codes.");

  await fs.mkdir(OUT_DIR, { recursive: true });

  if (!baseUrl) {
    const manifestPath = path.join(OUT_DIR, "_codes.txt");
    await fs.writeFile(manifestPath, codes.join("\n"), "utf-8");
    console.log("No ITEM_IMAGE_BASE_URL set. Wrote", manifestPath);
    console.log("Set ITEM_IMAGE_BASE_URL to a base URL (e.g. https://example.com/icons) and re-run to download.");
    return;
  }

  const base = baseUrl.replace(/\/$/, "");
  const pathSuffix = process.env.ITEM_IMAGE_PATH_SUFFIX ?? "";
  let ok = 0;
  let skip = 0;
  const failedCodes = [];
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    const url = `${base}/${code}${pathSuffix}.png`;
    const outPath = path.join(OUT_DIR, `${code}.png`);
    try {
      const existing = await fs.stat(outPath).catch(() => null);
      if (existing) {
        skip++;
        if ((i + 1) % 500 === 0) console.log("Progress:", i + 1, "/", codes.length);
        continue;
      }
      const buf = await downloadOne(url);
      if (buf && buf.length > 0) {
        await fs.writeFile(outPath, buf);
        ok++;
      } else {
        failedCodes.push(code);
      }
    } catch (e) {
      failedCodes.push(code);
    }
    if ((i + 1) % 100 === 0) console.log("Progress:", i + 1, "/", codes.length, "downloaded:", ok, "skipped (cached):", skip);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  if (failedCodes.length > 0) {
    console.log("Trying fallback (normcode/alternategfx) for", failedCodes.length, "failed codes…");
    const fallbackMap = await buildFallbackMap();
    let fallbackOk = 0;
    const stillFailed = [];
    for (const code of failedCodes) {
      const outPath = path.join(OUT_DIR, `${code}.png`);
      const fallbacks = fallbackMap.get(code) ?? [];
      let saved = false;
      for (const fb of fallbacks) {
        const url = `${base}/${fb}${pathSuffix}.png`;
        const buf = await downloadOne(url);
        if (buf && buf.length > 0) {
          await fs.writeFile(outPath, buf);
          fallbackOk++;
          saved = true;
          break;
        }
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
      if (!saved) stillFailed.push(code);
    }
    const skippedPath = path.join(OUT_DIR, "_skipped.txt");
    const skippedContent = [
      "# No image at base URL or fallbacks. Includes unique image codes and expansion/quest items. Uniques fall back to base image in UI.",
      stillFailed.join("\n"),
    ].join("\n");
    await fs.writeFile(skippedPath, skippedContent, "utf-8");
    console.log("Done. Downloaded:", ok, "+ fallback:", fallbackOk, "Skipped (cached):", skip, "Still missing (see _skipped.txt):", stillFailed.length);
  } else {
    console.log("Done. Downloaded:", ok, "Skipped (already present):", skip);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
