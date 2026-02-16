/** Catalog entry from catalog.sets.json or catalog.uniques.json */

export type CatalogEntry =
  | { kind: "header"; label: string; enabled?: boolean }
  | {
      rarity: "set" | "unique";
      label: string;
      code: string | string[];
      /** Unique inventory graphic code (e.g. from invfile); used for unique item images. */
      imageCode?: string;
      /** Maxroll/D2Planner image id (e.g. unique381, set042); image at /item-unique/{id}.webp or /item-set/{id}.webp */
      maxrollId?: string;
      enabled?: boolean;
      slot?: string;
      baseName?: string;
      baseType?: string;
      source?: string;
    };

export interface Catalog {
  name: string;
  entries: CatalogEntry[];
  generatedAt?: string;
  source?: Record<string, unknown>;
}

/** Equipment quality tier for base filtering (normal / exceptional / elite). */
export type EquipmentQuality = "normal" | "exceptional" | "elite";

/** Bases catalog entry (catalog.bases.json): header or base item */
export type BasesCatalogEntry =
  | { kind: "header"; label: string }
  | { code: string; label: string; slot?: string; quality?: EquipmentQuality };

export interface BasesCatalog {
  name: string;
  entries: BasesCatalogEntry[];
  generatedAt?: string;
  source?: Record<string, unknown>;
}

/** Gems catalog entry (catalog.gems.json): header or gem item */
export type GemsCatalogEntry =
  | { kind: "header"; label: string }
  | { code: string; label: string; slot?: string };

export interface GemsCatalog {
  name: string;
  entries: GemsCatalogEntry[];
  generatedAt?: string;
  source?: Record<string, unknown>;
}

/** Potions catalog entry (catalog.potions.json): header or potion item */
export type PotionsCatalogEntry =
  | { kind: "header"; label: string }
  | { code: string; label: string; slot?: string };

export interface PotionsCatalog {
  name: string;
  entries: PotionsCatalogEntry[];
  generatedAt?: string;
  source?: Record<string, unknown>;
}

/** Quest catalog entry (catalog.quest.json): header or quest item */
export type QuestCatalogEntry =
  | { kind: "header"; label: string }
  | { code: string; label: string; slot?: string };

export interface QuestCatalog {
  name: string;
  entries: QuestCatalogEntry[];
  generatedAt?: string;
  source?: Record<string, unknown>;
}

/** Item for the list: single code or a bundle (whole set) with multiple codes */
export interface SelectableItem {
  /** Unique key (single code, or "bundle:code1,code2,..." for bundles; for uniques "baseCode|label") */
  code: string;
  /** All game codes this row represents (one for single, multiple for "whole set" bundle) */
  codes: string[];
  label: string;
  rarity: "set" | "unique";
  slot?: string;
  /** For sets: parent set name. For uniques: base item name (shown as top line). */
  setLabel?: string;
  /** Base equipment quality (for filtering Normal/Exceptional/Elite). */
  quality?: EquipmentQuality;
  /** Image asset code (e.g. unique invfile); when set, used instead of codes[0] for item image. */
  imageCode?: string;
  /** Maxroll/D2Planner image id (e.g. unique381, set042); when set, use /item-unique/{id}.webp or /item-set/{id}.webp. */
  maxrollId?: string;
}

/** User selection state */
export interface Selection {
  profileName: string;
  sets: string[];
  uniques: string[];
}

/** Game filter rule (D2R import format) */
export interface FilterRule {
  name: string;
  enabled: boolean;
  ruleType: "hide" | "show";
  filterEtherealSocketed: boolean;
  equipmentRarity?: string[];
  equipmentQuality?: string[];
  equipmentCategory?: string[];
  itemCategory?: string[];
  equipmentItemCode?: string[];
  /** Used for runes (and other non-equipment items) */
  itemCode?: string[];
  /** Gold threshold: hide rule = gold < value, show rule = gold > value */
  goldFilterValue?: number;
}

export interface LootFilter {
  name: string;
  rules: FilterRule[];
}
