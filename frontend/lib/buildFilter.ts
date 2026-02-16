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

/** One named item rule (e.g. "Arrows" with codes ["aqv"]). */
export interface MiscItemRule {
  name: string;
  codes: string[];
}

/** Game itemCategory -> rule name and codes for Endgame panel (absol, terrt, uberm). */
const ENDGAME_CATEGORIES: Record<
  string,
  { name: string; codes: string[] }
> = {
  absol: {
    name: "Essence / Token of Absolution",
    codes: ["tes", "ceh", "bet", "fed", "toa"],
  },
  terrt: {
    name: "Terrorize Tokens",
    codes: ["xa1", "xa2", "xa3", "xa4", "xa5"],
  },
  uberm: {
    name: "Uber Materials",
    codes: ["pk1", "pk2", "pk3", "mbr", "dhn", "bey", "std", "ua1", "ua2", "ua3", "ua4", "ua5"],
  },
};

/**
 * Build D2R loot filter JSON from selected codes per category.
 * Order: normal, socketedEthereal, normalSuperior, socketedEtherealSuperior, magic, rare, unique, sets, runes, quest, endgame, gems, misc (per-label), gold.
 */
export function buildFilterFromSelection(
  profileNameInput: string,
  setCodes: string[],
  uniqueCodes: string[],
  runeCodes: string[] = [],
  normalCodes: string[] = [],
  magicCodes: string[] = [],
  rareCodes: string[] = [],
  questCodes: string[] = [],
  gemCodes: string[] = [],
  miscItemRules: MiscItemRule[] = [],
  socketedEtherealCodes: string[] = [],
  normalSuperiorCodes: string[] = [],
  socketedEtherealSuperiorCodes: string[] = [],
  endgameCodes: string[] = [],
  goldFilter?: { enabled: boolean; threshold: number }
): LootFilter {
  const rules: FilterRule[] = [buildHideRule()];

  if (normalCodes.length > 0) {
    rules.push({
      name: gameSafeName("Normal"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: false,
      equipmentRarity: ["normal"],
      equipmentItemCode: [...normalCodes],
    });
  }
  if (socketedEtherealCodes.length > 0) {
    rules.push({
      name: gameSafeName("Socketed Ethereal"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: true,
      equipmentRarity: ["normal"],
      equipmentItemCode: [...socketedEtherealCodes],
    });
  }
  if (normalSuperiorCodes.length > 0) {
    rules.push({
      name: gameSafeName("Superior Items(White)"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: false,
      equipmentRarity: ["hiQuality"],
      equipmentItemCode: [...normalSuperiorCodes],
    });
  }
  if (socketedEtherealSuperiorCodes.length > 0) {
    rules.push({
      name: gameSafeName("Socketed Ethereal Superior"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: true,
      equipmentRarity: ["hiQuality"],
      equipmentItemCode: [...socketedEtherealSuperiorCodes],
    });
  }
  if (magicCodes.length > 0) {
    rules.push({
      name: gameSafeName("Magic"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: false,
      equipmentRarity: ["magic"],
      equipmentItemCode: [...magicCodes],
    });
  }
  if (rareCodes.length > 0) {
    rules.push({
      name: gameSafeName("Rare"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: false,
      equipmentRarity: ["rare"],
      equipmentItemCode: [...rareCodes],
    });
  }
  if (uniqueCodes.length > 0) {
    rules.push({
      name: gameSafeName("Uniques"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: false,
      equipmentRarity: ["unique"],
      equipmentItemCode: [...uniqueCodes],
    });
  }
  if (setCodes.length > 0) {
    rules.push({
      name: gameSafeName("Sets"),
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
  if (questCodes.length > 0) {
    rules.push({
      name: gameSafeName("Quest Items"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: false,
      itemCode: [...questCodes],
    });
  }
  for (const [category, { name, codes }] of Object.entries(ENDGAME_CATEGORIES)) {
    const selected = codes.filter((c) => endgameCodes.includes(c));
    if (selected.length > 0) {
      rules.push({
        name: gameSafeName(name),
        enabled: true,
        ruleType: "show",
        filterEtherealSocketed: false,
        itemCategory: [category],
      });
    }
  }
  if (gemCodes.length > 0) {
    rules.push({
      name: gameSafeName("Gems"),
      enabled: true,
      ruleType: "show",
      filterEtherealSocketed: false,
      itemCode: [...gemCodes],
    });
  }
  for (const { name, codes } of miscItemRules) {
    if (codes.length > 0) {
      rules.push({
        name: gameSafeName(name),
        enabled: true,
        ruleType: "show",
        filterEtherealSocketed: false,
        itemCode: [...codes],
      });
    }
  }
  if (goldFilter?.enabled && goldFilter.threshold > 0) {
    rules.push({
      name: gameSafeName(`Gold Less Than ${goldFilter.threshold}`),
      enabled: true,
      ruleType: "hide",
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
