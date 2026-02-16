#!/usr/bin/env node
/**
 * Download Maxroll D2 item images from assets-ng.maxroll.gg/d2planner/images/uniques/
 * - set000.webp .. set126.webp
 * - unique000.webp .. unique406.webp
 *
 * Saves set*.webp to frontend/public/item-set/, unique*.webp to frontend/public/item-unique/.
 *
 * Usage: node download-maxroll-unique-images.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = "https://assets-ng.maxroll.gg/d2planner/images/uniques";
const ITEM_UNIQUE_DIR = path.join(__dirname, "frontend", "public", "item-unique");
const ITEM_SET_DIR = path.join(__dirname, "frontend", "public", "item-set");
const DELAY_MS = 80;

async function downloadOne(filename, outDir) {
  const url = `${BASE_URL}/${filename}`;
  const filepath = path.join(outDir, filename);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://maxroll.gg/",
      },
      redirect: "follow",
    });
    if (!res.ok) return { filename, ok: false, status: res.status };
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(filepath, buf);
    return { filename, ok: true };
  } catch (err) {
    return { filename, ok: false, error: err.message };
  }
}

async function main() {
  await fs.mkdir(ITEM_UNIQUE_DIR, { recursive: true });
  await fs.mkdir(ITEM_SET_DIR, { recursive: true });

  const files = [];
  for (let i = 0; i <= 126; i++) {
    files.push({ name: `set${String(i).padStart(3, "0")}.webp`, dir: ITEM_SET_DIR });
  }
  for (let i = 0; i <= 406; i++) {
    files.push({ name: `unique${String(i).padStart(3, "0")}.webp`, dir: ITEM_UNIQUE_DIR });
  }

  console.log("Downloading", files.length, "images (sets -> item-set, uniques -> item-unique)");

  const results = [];
  for (let i = 0; i < files.length; i++) {
    const { name, dir } = files[i];
    const r = await downloadOne(name, dir);
    results.push(r);
    if (r.ok) {
      process.stdout.write(`\r[${i + 1}/${files.length}] ${name}     `);
    } else {
      console.log("\n", name, r.status || r.error);
    }
    if (i < files.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  const failed = results.filter((x) => !x.ok);
  if (failed.length) {
    const reportPath = path.join(ITEM_UNIQUE_DIR, "_failed.txt");
    await fs.writeFile(
      reportPath,
      failed.map((f) => f.filename).join("\n"),
      "utf-8"
    );
    console.log("\nFailed:", failed.length, "- see", reportPath);
  }
  console.log("\nDone. Downloaded", results.filter((x) => x.ok).length, "images.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
