import type { EquipmentQuality, ArmorWeightClass } from "./types";

export const QUALITIES: EquipmentQuality[] = [
  "normal",
  "exceptional",
  "elite",
];
export const ARMOR_WEIGHTS: ArmorWeightClass[] = ["light", "medium", "heavy"];
export const WEAPON_HANDLING_OPTIONS = ["1H", "2H"] as const;
export type WeaponHandling = (typeof WEAPON_HANDLING_OPTIONS)[number];
export const SLOT_FILTER_ORDER = [
  "Helm",
  "Armor",
  "Weapon",
  "Shield",
  "Gloves",
  "Belt",
  "Boots",
  "Ring",
  "Amulet",
  "Charm",
  "Other",
];

export const MAX_RULES = 32;

export const TAB_ORDER = [
  "normal",
  "socketedEthereal",
  "socketedEtherealSuperior",
  "magic",
  "rare",
  "unique",
  "sets",
  "runes",
  "gems",
  "potions",
  "quest",
  "endgame",
  "misc",
  "gold",
] as const;

/** Group potions into 4 rules (Health, Mana, Rejuvenation, Status) to save rule count. */
export const POTION_GROUPS: { name: string; codes: string[] }[] = [
  { name: "Health Potions", codes: ["hp1", "hp2", "hp3", "hp4", "hp5"] },
  { name: "Mana Potions", codes: ["mp1", "mp2", "mp3", "mp4", "mp5"] },
  { name: "Rejuvenation Potions", codes: ["rvl", "rvs"] },
  { name: "Status Potions", codes: ["yps", "vps", "wms"] },
];

/** Quest catalog codes that belong to Endgame (tokens, essences, keys, organs, etc.). */
export const ENDGAME_CODES = [
  "tes",
  "ceh",
  "bet",
  "fed",
  "toa", // Essence / Token of Absolution
  "xa1",
  "xa2",
  "xa3",
  "xa4",
  "xa5", // Terrorize Tokens (Worldstone Shards)
  "pk1",
  "pk2",
  "pk3",
  "mbr",
  "dhn",
  "bey",
  "std",
  "ua1",
  "ua2",
  "ua3",
  "ua4",
  "ua5", // Uber Materials
] as const;
