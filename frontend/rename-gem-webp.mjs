#!/usr/bin/env node
/**
 * Find gem .webp under public/ (e.g. chipped_amethyst.webp, saphire.webp),
 * rename to item-images/{code}.webp to match catalog.gems.json.
 * Run from frontend: node rename-gem-webp.mjs
 * Then run: yarn convert-quest-images (converts all webp in item-images to png).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "public");
const ITEM_IMAGES = path.join(PUBLIC, "item-images");

/** Gem filename (no .webp, lowercase) -> code. Handles "saphire" typo. */
const GEM_NAME_TO_CODE = new Map([
  ["chipped_amethyst", "gcv"],
  ["flawed_amethyst", "gfv"],
  ["flawless_amethyst", "gzv"],
  ["amethyst", "gsv"],
  ["perfect_amethyst", "gpv"],
  ["chipped_topaz", "gcy"],
  ["flawed_topaz", "gfy"],
  ["flawless_topaz", "gly"],
  ["topaz", "gsy"],
  ["perfect_topaz", "gpy"],
  ["chipped_sapphire", "gcb"],
  ["flawed_sapphire", "gfb"],
  ["flawless_sapphire", "glb"],
  ["sapphire", "gsb"],
  ["perfect_sapphire", "gpb"],
  ["chipped_saphire", "gcb"],
  ["flawed_saphire", "gfb"],
  ["flawless_saphire", "glb"],
  ["saphire", "gsb"],
  ["perfect_saphire", "gpb"],
  ["chipped_emerald", "gcg"],
  ["flawed_emerald", "gfg"],
  ["flawless_emerald", "glg"],
  ["emerald", "gsg"],
  ["perfect_emerald", "gpg"],
  ["chipped_ruby", "gcr"],
  ["flawed_ruby", "gfr"],
  ["flawless_ruby", "glr"],
  ["ruby", "gsr"],
  ["perfect_ruby", "gpr"],
  ["chipped_diamond", "gcw"],
  ["flawed_diamond", "gfw"],
  ["flawless_diamond", "glw"],
  ["diamond", "gsw"],
  ["perfect_diamond", "gpw"],
  ["chipped_skull", "skc"],
  ["flawed_skull", "skf"],
  ["flawless_skull", "skl"],
  ["skull", "sku"],
  ["perfect_skull", "skz"],
]);

async function findGemWebps(dir, list = []) {
  const entries = await fs
    .readdir(dir, { withFileTypes: true })
    .catch(() => []);
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isFile() && e.name.endsWith(".webp")) {
      const base = e.name.slice(0, -5);
      const key = base.toLowerCase().replace(/\s+/g, "_");
      const code = GEM_NAME_TO_CODE.get(key);
      if (code) list.push({ src: full, code, base });
    }
    if (e.isDirectory() && !e.name.startsWith("."))
      await findGemWebps(full, list);
  }
  return list;
}

async function main() {
  await fs.mkdir(ITEM_IMAGES, { recursive: true });
  const files = await findGemWebps(PUBLIC);
  console.log("Found", files.length, "gem .webp under", PUBLIC);

  for (const { src, code, base } of files) {
    const dest = path.join(ITEM_IMAGES, `${code}.webp`);
    if (path.resolve(src) === path.resolve(dest)) continue;
    try {
      await fs.rename(src, dest);
      console.log(`${base}.webp ->`, dest);
    } catch (err) {
      if (err.code === "EXDEV") {
        await fs.copyFile(src, dest);
        await fs.unlink(src).catch(() => {});
        console.log(`${base}.webp ->`, dest, "(copied then removed)");
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
