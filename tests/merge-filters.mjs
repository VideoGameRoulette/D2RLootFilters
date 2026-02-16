#!/usr/bin/env node
/**
 * Merge two loot filter JSON files into one (e.g. sets + uniques).
 * Keeps one "All" hide rule, then all show rules from both filters.
 *
 * Ensures unique rule names (game rejects duplicates).
 * Game rule cap (from exported_from_game.json): 1 hide + 31 show = 32 rules total.
 *
 * Usage:
 *   node merge-filters.mjs lootfilter-set.json lootfilter-unique.json lootfilter.json "SetsAndUniques"
 */

import fs from "node:fs";
import process from "node:process";

const RULE_CAP = 32;

function main() {
  const [setPath, uniquePath, outPath, filterName] = process.argv.slice(2);
  if (!setPath || !uniquePath || !outPath) {
    console.error("Usage: node merge-filters.mjs <set-filter.json> <unique-filter.json> <out.json> [filterName]");
    process.exit(1);
  }

  const setFilter = JSON.parse(fs.readFileSync(setPath, "utf8"));
  const uniqueFilter = JSON.parse(fs.readFileSync(uniquePath, "utf8"));

  const setRules = Array.isArray(setFilter.rules) ? setFilter.rules : [];
  const uniqueRules = Array.isArray(uniqueFilter.rules) ? uniqueFilter.rules : [];

  const hideRule = setRules.find((r) => r.ruleType === "hide") ?? uniqueRules.find((r) => r.ruleType === "hide");
  const setShow = setRules.filter((r) => r.ruleType === "show");
  const uniqueShow = uniqueRules.filter((r) => r.ruleType === "show");

  if (!hideRule) {
    console.error("No hide rule found in either filter.");
    process.exit(1);
  }

  // Game rejects when the same equipmentItemCode appears in more than one rule.
  // Merge rules that share the same equipmentItemCode into one rule with combined rarities.
  const byCode = new Map();
  function addRule(r) {
    const key = JSON.stringify(r.equipmentItemCode);
    if (!byCode.has(key)) {
      byCode.set(key, { rarities: new Set(), rule: r });
    }
    const entry = byCode.get(key);
    entry.rarities.add(r.equipmentRarity[0]);
  }
  setShow.forEach(addRule);
  uniqueShow.forEach(addRule);

  const MAX_NAME = 32;
  const usedNames = new Set(["All"]);
  function uniqueName(base) {
    const clean = String(base).replace(/[^A-Za-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
    let name = clean;
    let n = 1;
    while (usedNames.has(name)) {
      n += 1;
      const suffix = ` ${n}`;
      name = (clean.slice(0, MAX_NAME - suffix.length) + suffix).trim().slice(0, MAX_NAME);
    }
    usedNames.add(name);
    return name;
  }

  // Game export only has one rarity per show rule; combined ["set","unique"] may be rejected.
  // Expand any rule with multiple rarities into one rule per rarity (same code, unique names).
  const expanded = [];
  for (const [, { rarities, rule }] of byCode) {
    const raritiesList = [...rarities].sort();
    for (let i = 0; i < raritiesList.length; i++) {
      const baseName = raritiesList.length === 1 ? rule.name : (i === 0 ? rule.name : `${rule.name} ${i + 1}`);
      expanded.push({
        name: uniqueName(baseName),
        enabled: rule.enabled,
        ruleType: "show",
        filterEtherealSocketed: false,
        equipmentRarity: [raritiesList[i]],
        equipmentItemCode: rule.equipmentItemCode,
      });
    }
  }

  const showCap = RULE_CAP - 1;
  const capped = expanded.length > showCap ? expanded.slice(0, showCap) : expanded;
  if (expanded.length > showCap) {
    console.warn(`⚠️ Game rule cap is ${RULE_CAP}. Truncated to ${RULE_CAP} rules (1 hide + ${showCap} show).`);
  }
  const rules = [hideRule, ...capped];

  // Profile name: spaces not allowed on import.
  const name = (filterName ?? "Merged").replace(/[^A-Za-z0-9]/g, "").slice(0, 32) || "Merged";
  const merged = { name, rules };

  const minify = process.env.MINIFY === "1" || process.argv.includes("--minify");
  const json = minify ? JSON.stringify(merged) : JSON.stringify(merged, null, 4);
  fs.writeFileSync(outPath, json, "utf8");
  const mergedCount = byCode.size;
  console.log(`Wrote ${outPath}: ${rules.length} rules (1 hide + ${capped.length} show; cap ${RULE_CAP})${minify ? " [minified]" : ""}.`);
}

main();
