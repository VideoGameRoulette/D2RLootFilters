import type { SelectableItem } from "./types";

/** Gem label patterns (in Other slot) – Sapphire, Emerald, Ruby, etc. Jewels excluded (go to Magic/Rare). */
const GEM_LABELS = /Sapphire|Emerald|Ruby|Topaz|Amethyst|Diamond|Skull/i;

/** Quest item codes. Identify/Town Portal scrolls and tomes (isc, tsc, ibk, tbk) are in Misc. */
const QUEST_CODES = new Set([
  "bks", "bkd", "bbb", "g33", "g34", "box", "hst", "xyz", "j34",
  "bet", "ceh", "fed", "tes", "dhn", "bey", "brz", "eyz", "fng", "mbr", "qbr", "qey", "hrn",
  "0sc", "ass", "tr1", "tr2", "pk1", "pk2", "pk3", "luv", "flg",
  "mss", "ice", "elx", "hrb", "hrt", "jaw", "qhr", "qll", "scz", "sol", "spe", "std", "tal", "tch", "toa",
  "ua1", "ua2", "ua3", "ua4", "ua5", "um1", "um2", "um3", "um4", "um5", "um6",
  "xa1", "xa2", "xa3", "xa4", "xa5",
]);

export function isGemItem(item: SelectableItem): boolean {
  return GEM_LABELS.test(item.label) && item.slot === "Other";
}

export function isQuestItem(item: SelectableItem): boolean {
  return QUEST_CODES.has(item.code);
}

export function categorizeMisc(
  items: SelectableItem[]
): { gems: SelectableItem[]; quest: SelectableItem[]; other: SelectableItem[] } {
  const gems: SelectableItem[] = [];
  const quest: SelectableItem[] = [];
  const other: SelectableItem[] = [];

  for (const item of items) {
    if (isGemItem(item)) {
      gems.push(item);
    } else if (isQuestItem(item)) {
      quest.push(item);
    } else {
      other.push(item);
    }
  }

  return { gems, quest, other };
}
