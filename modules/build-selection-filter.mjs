#!/usr/bin/env node
/**
 * Build a loot filter from a SELECTION of item codes, using one rule per category.
 * Stays well under the 32-rule cap: 1 hide + one "Show - Selected X" rule per category.
 *
 * Input: selection JSON, e.g.
 *   { "profileName": "MyFilter", "sets": ["usk","xpl"], "uniques": ["cap","skp"] }
 *
 * Output: filter with rules like:
 *   Show - Selected Sets   (equipmentRarity: ["set"], equipmentItemCode: [...])
 *   Show - Selected Uniques (equipmentRarity: ["unique"], equipmentItemCode: [...])
 *
 * Usage:
 *   node build-selection-filter.mjs selection.json lootfilter.json
 *
 * For a future web UI: user picks sets/uniques from catalogs → save selection.json
 * → run this script (or equivalent in backend) → user copies filter to game.
 */

import fs from "node:fs";
import process from "node:process";

const MAX_NAME = 32;
const RULE_CAP = 32;

function profileName(s, max = MAX_NAME) {
  const str = String(s ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, max);
  return str || "LootFilter";
}

function gameSafeName(s, max = MAX_NAME) {
  const str = String(s ?? "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return str.length <= max ? str : str.slice(0, max);
}

function buildHideAllRule() {
  return {
    name: "All",
    enabled: true,
    ruleType: "hide",
    filterEtherealSocketed: true,
    equipmentRarity: ["rare", "lowQuality", "magic", "unique", "set", "hiQuality", "normal"],
    equipmentQuality: ["normal", "exceptional", "elite"],
    equipmentCategory: ["acce", "armo", "weap"],
    itemCategory: ["misc"]
  };
}

function buildShowRule(name, rarity, codes) {
  const itemCodes = Array.isArray(codes) ? codes : [codes];
  if (itemCodes.length === 0) return null;
  return {
    name: gameSafeName(name),
    enabled: true,
    ruleType: "show",
    filterEtherealSocketed: false,
    equipmentRarity: [rarity],
    equipmentItemCode: itemCodes
  };
}

function main() {
  const [selectionPath, outPath] = process.argv.slice(2);
  if (!selectionPath || !outPath) {
    console.error("Usage: node build-selection-filter.mjs <selection.json> <output-filter.json>");
    console.error("");
    console.error("Selection JSON format:");
    console.error('  { "profileName": "MyFilter", "sets": ["usk","xpl"], "uniques": ["cap","skp"] }');
    process.exit(1);
  }

  const raw = fs.readFileSync(selectionPath, "utf8");
  const sel = JSON.parse(raw);

  const profileNameStr = profileName(sel.profileName ?? "Selection");
  const setCodes = Array.isArray(sel.sets) ? sel.sets : [];
  const uniqueCodes = Array.isArray(sel.uniques) ? sel.uniques : [];

  const rules = [buildHideAllRule()];

  const showRules = [
    ["Selected Sets", "set", setCodes],
    ["Selected Uniques", "unique", uniqueCodes]
  ];

  for (const [label, rarity, codes] of showRules) {
    const rule = buildShowRule(`Show - ${label}`, rarity, codes);
    if (rule) rules.push(rule);
  }

  if (rules.length > RULE_CAP) {
    console.warn(`⚠️ Rule cap is ${RULE_CAP}. Truncating.`);
    rules.length = RULE_CAP;
  }

  const filter = { name: profileNameStr, rules };
  const json = process.argv.includes("--minify") || process.env.MINIFY === "1"
    ? JSON.stringify(filter)
    : JSON.stringify(filter, null, 4);

  fs.writeFileSync(outPath, json, "utf8");
  console.log(`Wrote ${outPath}: ${rules.length} rules (1 hide + ${rules.length - 1} show). Profile: ${profileNameStr}`);
  console.log("Import: open file, Ctrl+A, Ctrl+C, then in-game IMPORT FROM CLIPBOARD.");
}

main();
