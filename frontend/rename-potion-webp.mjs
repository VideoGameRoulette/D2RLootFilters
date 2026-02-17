#!/usr/bin/env node
/**
 * Find potion .webp under public/, rename to item-images/{code}.webp to match catalog.potions.json.
 * Run from frontend: node rename-potion-webp.mjs
 * Then run: yarn convert-quest-images (converts all webp in item-images to png).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "public");
const ITEM_IMAGES = path.join(PUBLIC, "item-images");

/** Potion filename (no .webp, lowercase, spaces -> _) -> code. */
const POTION_NAME_TO_CODE = new Map([
  ["minor_healing_potion", "hp1"],
  ["light_healing_potion", "hp2"],
  ["healing_potion", "hp3"],
  ["greater_healing_potion", "hp4"],
  ["super_healing_potion", "hp5"],
  ["minor_mana_potion", "mp1"],
  ["light_mana_potion", "mp2"],
  ["mana_potion", "mp3"],
  ["greater_mana_potion", "mp4"],
  ["super_mana_potion", "mp5"],
  ["full_rejuvenation_potion", "rvl"],
  ["rejuvenation_potion", "rvs"],
  ["full_rejuv_potion", "rvl"],
  ["rejuv_potion", "rvs"],
  ["antidote_potion", "yps"],
  ["stamina_potion", "vps"],
  ["thawing_potion", "wms"],
  ["super_healing_mana", "mp5"], // likely "Super Mana Potion"
  ["strangling_gas_potion", "gpl"],
  ["fulminating_potion", "opl"],
]);

function normalizeKey(name) {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/['']/g, "");
}

async function findPotionWebps(dir, list = []) {
  const entries = await fs
    .readdir(dir, { withFileTypes: true })
    .catch(() => []);
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isFile() && e.name.endsWith(".webp")) {
      const base = e.name.slice(0, -5);
      const key = normalizeKey(base);
      const code = POTION_NAME_TO_CODE.get(key);
      if (code) list.push({ src: full, code, base: e.name });
    }
    if (e.isDirectory() && !e.name.startsWith("."))
      await findPotionWebps(full, list);
  }
  return list;
}

async function main() {
  await fs.mkdir(ITEM_IMAGES, { recursive: true });
  const files = await findPotionWebps(PUBLIC);
  console.log("Found", files.length, "potion .webp under", PUBLIC);

  for (const { src, code, base } of files) {
    const dest = path.join(ITEM_IMAGES, `${code}.webp`);
    if (path.resolve(src) === path.resolve(dest)) continue;
    try {
      await fs.rename(src, dest);
      console.log(base, "->", dest);
    } catch (err) {
      if (err.code === "EXDEV") {
        await fs.copyFile(src, dest);
        await fs.unlink(src).catch(() => {});
        console.log(base, "->", dest, "(copied then removed)");
      } else {
        console.error(base, err.message);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
