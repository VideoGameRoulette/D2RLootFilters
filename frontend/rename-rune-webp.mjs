#!/usr/bin/env node
/**
 * Find *_rune.webp under public/, rename to item-images/{code}.webp (r01–r33).
 * Run from frontend: node rename-rune-webp.mjs
 * Then run: yarn convert-quest-images (to convert rune + quest webp to png).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "public");
const ITEM_IMAGES = path.join(PUBLIC, "item-images");

/** Rune name (any case) -> code. Must match frontend/lib/runes.ts */
const NAME_TO_CODE = new Map([
  ["el", "r01"], ["eld", "r02"], ["tir", "r03"], ["nef", "r04"], ["eth", "r05"],
  ["ith", "r06"], ["tal", "r07"], ["ral", "r08"], ["ort", "r09"], ["thul", "r10"],
  ["amn", "r11"], ["sol", "r12"], ["shael", "r13"], ["dol", "r14"], ["hel", "r15"],
  ["io", "r16"], ["lum", "r17"], ["ko", "r18"], ["fal", "r19"], ["lem", "r20"],
  ["pul", "r21"], ["um", "r22"], ["mal", "r23"], ["ist", "r24"], ["gul", "r25"],
  ["vex", "r26"], ["ohm", "r27"], ["lo", "r28"], ["sur", "r29"], ["ber", "r30"],
  ["jah", "r31"], ["cham", "r32"], ["zod", "r33"],
]);

async function findRuneWebps(dir, list = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isFile() && e.name.endsWith("_rune.webp")) {
      const name = e.name.slice(0, -"_rune.webp".length).toLowerCase();
      const code = NAME_TO_CODE.get(name);
      if (code) list.push({ src: full, code, name });
    }
    if (e.isDirectory() && !e.name.startsWith("."))
      await findRuneWebps(full, list);
  }
  return list;
}

async function main() {
  await fs.mkdir(ITEM_IMAGES, { recursive: true });
  const files = await findRuneWebps(PUBLIC);
  console.log("Found", files.length, "*_rune.webp under", PUBLIC);

  for (const { src, code, name } of files) {
    const dest = path.join(ITEM_IMAGES, `${code}.webp`);
    if (src === dest) continue;
    try {
      await fs.rename(src, dest);
      console.log(name, "_rune.webp ->", dest);
    } catch (err) {
      if (err.code === "EXDEV") {
        await fs.copyFile(src, dest);
        await fs.unlink(src).catch(() => {});
        console.log(name, "_rune.webp ->", dest, "(copied then removed)");
      } else {
        console.error(name, err.message);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
