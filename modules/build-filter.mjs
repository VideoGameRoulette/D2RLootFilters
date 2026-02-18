// build-filter.mjs
import fs from "node:fs";

const MAX_NAME = 32;
/** Game rule cap (from exported_from_game.json): 1 hide + 31 show = 32 rules total. */
const RULE_CAP = 32;

/** Game import only accepts rule names with A-Z a-z 0-9 and space (like exported_from_game.json). */
function gameSafeName(s, max = MAX_NAME) {
  const str = String(s ?? "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return str.length <= max ? str : str.slice(0, max);
}

/** Profile name (top-level): no spaces allowed on import. */
function profileName(s, max = MAX_NAME) {
  const str = String(s ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, max);
  return str || "LootFilter";
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

function buildHeaderRule(label) {
  // As you requested (no extra fields)
  return {
    name: gameSafeName(label),
    enabled: false,
    ruleType: "show",
    filterEtherealSocketed: false
  };
}

function buildShowRule({ rarity, label, codes, enabled }, usedNames) {
  if (!rarity) throw new Error("Show rule missing rarity");
  if (!label) throw new Error("Show rule missing label");
  if (!codes || (Array.isArray(codes) && codes.length === 0)) {
    throw new Error(`Show rule "${label}" missing codes`);
  }

  const itemCodes = Array.isArray(codes) ? codes : [codes];
  let name = gameSafeName(label);
  if (usedNames) {
    const base = name;
    let n = 1;
    while (usedNames.has(name)) {
      n += 1;
      const suffix = ` ${n}`;
      name = gameSafeName(base.slice(0, MAX_NAME - suffix.length) + suffix);
    }
    usedNames.add(name);
  }

  return {
    name,
    enabled: !!enabled,
    ruleType: "show",
    filterEtherealSocketed: false,
    equipmentRarity: [rarity],
    equipmentItemCode: itemCodes
  };
}

/**
 * Accept:
 * - array catalog: [{type:"header"|...}, ...]
 * - wrapper: { entries:[...] }
 * - set-catalog entries: { kind:"header" } and { code:"" | code:[] }
 */
function loadAndNormalizeCatalog(rawJson) {
  const data = JSON.parse(rawJson);

  const entries = Array.isArray(data)
    ? data
    : Array.isArray(data?.entries)
      ? data.entries
      : null;

  if (!entries) {
    throw new Error("Catalog must be an array OR an object with an 'entries' array.");
  }

  const normalized = entries.map((e) => {
    if (e?.type === "header" || e?.kind === "header") {
      return { type: "header", label: e.label ?? e.name ?? "" };
    }

    if (e?.type === "item") {
      return { type: "item", rarity: e.rarity, label: e.label, code: e.code, enabled: e.enabled };
    }
    if (e?.type === "bundle") {
      return { type: "bundle", rarity: e.rarity, label: e.label, codes: e.codes, enabled: e.enabled };
    }

    // set-catalog style
    if (typeof e?.code === "string") {
      return { type: "item", rarity: e.rarity, label: e.label, code: e.code, enabled: e.enabled };
    }
    if (Array.isArray(e?.code)) {
      return { type: "bundle", rarity: e.rarity, label: e.label, codes: e.code, enabled: e.enabled };
    }

    return { type: "__unknown__", original: e };
  });

  const unknown = normalized.find((x) => x.type === "__unknown__");
  if (unknown) {
    throw new Error(`Unknown entry shape: ${JSON.stringify(unknown.original)}`);
  }

  return normalized;
}

function validateEntry(e, idx) {
  const where = `at index ${idx}`;
  if (!e || typeof e !== "object") throw new Error(`Invalid entry ${where}`);
  if (!e.type) throw new Error(`Entry missing "type" ${where}`);

  if (e.type === "header") {
    if (!e.label) throw new Error(`Header missing "label" ${where}`);
    return;
  }

  if (e.type === "item") {
    if (!e.rarity) throw new Error(`Item missing "rarity" ${where}`);
    if (!e.label) throw new Error(`Item missing "label" ${where}`);
    if (!e.code || typeof e.code !== "string") throw new Error(`Item missing "code" ${where}`);
    return;
  }

  if (e.type === "bundle") {
    if (!e.rarity) throw new Error(`Bundle missing "rarity" ${where}`);
    if (!e.label) throw new Error(`Bundle missing "label" ${where}`);
    if (!Array.isArray(e.codes) || e.codes.length === 0) throw new Error(`Bundle missing "codes" ${where}`);
    return;
  }

  throw new Error(`Unknown entry type "${e.type}" ${where}`);
}

function warnSize(jsonString, ruleCount) {
  const bytes = Buffer.byteLength(jsonString, "utf8");
  const len = jsonString.length;
  console.log(`Profile code length: ${len} chars (${bytes} bytes), ${ruleCount} rules`);
  if (ruleCount > RULE_CAP) {
    console.warn(`⚠️ Rule cap is ${RULE_CAP} (1 hide + ${RULE_CAP - 1} show). Game will reject. Use --max-rules=${RULE_CAP} (default) to stay under.`);
  }
}

function parseMaxRules(argv) {
  const arg = argv.find((a) => a.startsWith("--max-rules="));
  if (!arg) return RULE_CAP;
  const n = parseInt(arg.slice("--max-rules=".length), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, RULE_CAP) : RULE_CAP;
}

function main() {
  const argv = process.argv.slice(2);
  const catalogPath = argv[0] ?? "catalog.json";
  const outPath = argv[1] ?? "lootfilter.json";
  const filterNameRaw = argv[2] ?? "VGR Ultimate";
  const maxRules = parseMaxRules(argv);

  const raw = fs.readFileSync(catalogPath, "utf8");
  const catalog = loadAndNormalizeCatalog(raw);

  catalog.forEach((e, idx) => validateEntry(e, idx));

  const rules = [buildHideAllRule()];
  const usedNames = new Set(["All"]);

  for (const e of catalog) {
    if (maxRules !== null && rules.length >= maxRules) break;
    if (e.type === "header") continue;
    if (e.type === "item") {
      rules.push(buildShowRule({ rarity: e.rarity, label: e.label, codes: e.code, enabled: e.enabled }, usedNames));
      continue;
    }
    if (e.type === "bundle") {
      rules.push(buildShowRule({ rarity: e.rarity, label: e.label, codes: e.codes, enabled: e.enabled }, usedNames));
      continue;
    }
  }

  // Game rejects when the same equipmentItemCode appears in more than one rule.
  // Merge show rules that share the same equipmentItemCode, then expand to one rule per rarity
  // (game export only has single rarity per rule; ["set","unique"] may be rejected).
  const hideRule = rules[0];
  const showRules = rules.slice(1);
  const byCode = new Map();
  for (const r of showRules) {
    const key = JSON.stringify(r.equipmentItemCode);
    if (!byCode.has(key)) byCode.set(key, { rarities: new Set(), rule: r });
    byCode.get(key).rarities.add(r.equipmentRarity[0]);
  }
  const mergedShow = [];
  const mergedNames = new Set(["All"]);
  for (const [, { rarities, rule }] of byCode) {
    const raritiesList = [...rarities].sort();
    for (let i = 0; i < raritiesList.length; i++) {
      let name = raritiesList.length === 1 ? rule.name : (i === 0 ? rule.name : `${rule.name.slice(0, MAX_NAME - 3)} ${i + 1}`);
      name = name.slice(0, MAX_NAME).trim();
      let n = 1;
      while (mergedNames.has(name)) {
        n += 1;
        const suffix = ` ${n}`;
        name = (name.slice(0, MAX_NAME - suffix.length) + suffix).trim().slice(0, MAX_NAME);
      }
      mergedNames.add(name);
      mergedShow.push({
        name,
        enabled: rule.enabled,
        ruleType: "show",
        filterEtherealSocketed: false,
        equipmentRarity: [raritiesList[i]],
        equipmentItemCode: rule.equipmentItemCode,
      });
    }
  }
  let mergedRules = [hideRule, ...mergedShow];
  if (mergedRules.length > RULE_CAP) {
    mergedRules = mergedRules.slice(0, RULE_CAP);
    console.warn(`⚠️ Game rule cap is ${RULE_CAP}. Output truncated to ${RULE_CAP} rules (1 hide + ${RULE_CAP - 1} show).`);
  }

  const filter = {
    name: profileName(filterNameRaw),
    rules: mergedRules
  };

  const minify = process.env.MINIFY === "1" || argv.includes("--minify");
  const jsonOut = minify ? JSON.stringify(filter) : JSON.stringify(filter, null, 4);
  warnSize(jsonOut, mergedRules.length);
  if (rules.length >= maxRules && maxRules === RULE_CAP) {
    console.warn(`⚠️ Catalog has more items than the ${RULE_CAP}-rule cap. Only first ${RULE_CAP - 1} show rules (after merge/expand) are included.`);
  }
  if (mergedShow.length < showRules.length && mergedRules.length <= RULE_CAP) {
    console.log(`Merged ${showRules.length} → ${mergedShow.length} rules by item code (no duplicate codes).`);
  }

  fs.writeFileSync(outPath, jsonOut, "utf8");
  console.log(`Wrote ${outPath} with ${mergedRules.length} rules.`);
  console.log(`Import: open ${outPath}, Ctrl+A, Ctrl+C, then in-game use "IMPORT FROM CLIPBOARD".`);
}

main();
