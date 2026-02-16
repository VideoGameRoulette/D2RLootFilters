import type { LootFilter, FilterRule } from "./types";

const MAX_NAME = 32;

function profileName(s: string): string {
  const str = String(s ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, MAX_NAME);
  return str || "LootFilter";
}

function gameSafeName(s: string): string {
  const str = String(s ?? "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return str.length <= MAX_NAME ? str : str.slice(0, MAX_NAME);
}

function buildHideRule(): FilterRule {
  return {
    name: "All",
    enabled: true,
    ruleType: "hide",
    filterEtherealSocketed: true,
    equipmentRarity: [
      "rare",
      "lowQuality",
      "magic",
      "unique",
      "set",
      "hiQuality",
      "normal",
    ],
    equipmentQuality: ["normal", "exceptional", "elite"],
    equipmentCategory: ["acce", "armo", "weap"],
    itemCategory: ["misc"],
  };
}

/**
 * Build D2R loot filter JSON from selected codes per category.
 * Order: normal, socketedEthereal, magic, rare, unique, sets, runes, misc, gold.
 */
export function buildFilterFromSelection(
  profileNameInput: string,
  setCodes: string[],
  uniqueCodes: string[],
  runeCodes: string[] = [],
  normalCodes: string[] = [],
  magicCodes: string[] = [],
  rareCodes: string[] = [],
  miscCodes: string[] = [],
  socketedEtherealCodes: string[] = [],
  goldFilter?: { enabled: boolean; threshold: number }
): LootFilter {
  const rules: FilterRule[] = [buildHideRule()];

  if (normalCodes.length > 0) {
    rules.push({
      name: gameSafeName("Show - Normal"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: false,
      equipmentRarity: ["normal"],
      equipmentItemCode: [...normalCodes],
    });
  }
  if (socketedEtherealCodes.length > 0) {
    rules.push({
      name: gameSafeName("Show - Socketed / Ethereal"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: true,
      equipmentRarity: ["normal"],
      equipmentItemCode: [...socketedEtherealCodes],
    });
  }
  if (magicCodes.length > 0) {
    rules.push({
      name: gameSafeName("Show - Magic"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: false,
      equipmentRarity: ["magic"],
      equipmentItemCode: [...magicCodes],
    });
  }
  if (rareCodes.length > 0) {
    rules.push({
      name: gameSafeName("Show - Rare"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: false,
      equipmentRarity: ["rare"],
      equipmentItemCode: [...rareCodes],
    });
  }
  if (uniqueCodes.length > 0) {
    rules.push({
      name: gameSafeName("Show - Selected Uniques"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: false,
      equipmentRarity: ["unique"],
      equipmentItemCode: [...uniqueCodes],
    });
  }
  if (setCodes.length > 0) {
    rules.push({
      name: gameSafeName("Show - Selected Sets"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: false,
      equipmentRarity: ["set"],
      equipmentItemCode: [...setCodes],
    });
  }
  if (runeCodes.length > 0) {
    rules.push({
      name: gameSafeName("Runes"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: false,
      itemCode: [...runeCodes],
    });
  }
  if (miscCodes.length > 0) {
    rules.push({
      name: gameSafeName("Show - Misc"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: false,
      itemCode: [...miscCodes],
    });
  }
  if (goldFilter?.enabled && goldFilter.threshold > 0) {
    rules.push({
      name: gameSafeName(`Gold Less Than ${goldFilter.threshold}`),
      enabled: true,
      ruleType: "hide",
      filterEtherealSocketed: false,
      goldFilterValue: goldFilter.threshold,
    });
    rules.push({
      name: gameSafeName(`Gold Greater Than ${goldFilter.threshold}`),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: false,
      goldFilterValue: goldFilter.threshold,
    });
  }

  return {
    name: profileName(profileNameInput),
    rules,
  };
}

/** Serialize filter for download (game expects pretty-printed with 4 spaces) */
export function serializeFilter(filter: LootFilter, minify = false): string {
  return minify
    ? JSON.stringify(filter)
    : JSON.stringify(filter, null, 4);
}
