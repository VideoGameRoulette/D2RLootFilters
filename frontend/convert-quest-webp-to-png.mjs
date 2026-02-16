#!/usr/bin/env node
/**
 * Convert .webp to .png: (1) quest + rune codes found under public/,
 * (2) any .webp in item-images. Writes/overwrites .png in public/item-images.
 * Run from frontend: yarn convert-quest-images
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "public");
const ITEM_IMAGES = path.join(PUBLIC, "item-images");

const QUEST_CODES = ["ua1", "ua2", "ua3", "ua4", "ua5", "xa1", "xa2", "xa3", "xa4", "xa5"];
const RUNE_CODES = Array.from({ length: 33 }, (_, i) => "r" + String(i + 1).padStart(2, "0"));
const CODES = [...QUEST_CODES, ...RUNE_CODES];

async function findWebpRecursive(dir, code) {
  const name = `${code}.webp`;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isFile() && e.name === name) return full;
      if (e.isDirectory() && !e.name.startsWith(".")) {
        const found = await findWebpRecursive(full, code);
        if (found) return found;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function main() {
  await fs.mkdir(ITEM_IMAGES, { recursive: true });
  console.log("Looking under:", PUBLIC, "-> writing PNGs to", ITEM_IMAGES);

  for (const code of CODES) {
    const webpPath = await findWebpRecursive(PUBLIC, code);
    const pngPath = path.join(ITEM_IMAGES, `${code}.png`);
    if (!webpPath) {
      console.warn("Skip (no webp):", code);
      continue;
    }
    try {
      await sharp(webpPath).png().toFile(pngPath); // overwrites existing .png
      console.log(code, "->", pngPath);
      try {
        await fs.unlink(webpPath);
        console.log("  removed", webpPath);
      } catch (unlinkErr) {
        if (unlinkErr.code === "EBUSY" || unlinkErr.code === "EPERM") {
          console.warn("  (could not delete source – file in use; you can remove", webpPath, "manually)");
        } else {
          throw unlinkErr;
        }
      }
    } catch (err) {
      console.error(code, err.message);
    }
  }

  // Also convert any .webp in item-images to .png (overwrite existing)
  const itemImagesEntries = await fs.readdir(ITEM_IMAGES, { withFileTypes: true }).catch(() => []);
  for (const e of itemImagesEntries) {
    if (!e.isFile() || !e.name.endsWith(".webp")) continue;
    const base = e.name.slice(0, -5);
    const webpPath = path.join(ITEM_IMAGES, e.name);
    const pngPath = path.join(ITEM_IMAGES, base + ".png");
    try {
      await sharp(webpPath).png().toFile(pngPath);
      console.log(base, "(item-images) ->", pngPath);
      try {
        await fs.unlink(webpPath);
        console.log("  removed", webpPath);
      } catch (unlinkErr) {
        if (unlinkErr.code === "EBUSY" || unlinkErr.code === "EPERM") {
          console.warn("  (could not delete source – remove", webpPath, "manually if needed)");
        } else {
          throw unlinkErr;
        }
      }
    } catch (err) {
      console.error(e.name, err.message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
