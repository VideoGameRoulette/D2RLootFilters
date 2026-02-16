import type { BasesCatalog, BasesCatalogEntry, SelectableItem } from "./types";

export interface BasesToSelectableOptions {
  /** Exclude items with slot "Other" (they belong in Misc, not Normal/Magic/Rare). */
  excludeSlotOther?: boolean;
  /** Exclude items with these slot values (e.g. ["Ring", "Amulet"] for Normal section). */
  excludeSlots?: string[];
  /** Exclude items by code (e.g. ["vip"] for Amulet of the Viper - quest drop, unique). */
  excludeCodes?: string[];
  /** Include these codes even when slot is "Other" (e.g. ["cm1","cm2","cm3"] for charms in Magic/Rare). */
  includeCodesFromOther?: string[];
}

/** Flatten bases catalog to selectable items (one per base item code). Equipment only by default when excludeSlotOther. */
export function basesToSelectableItems(
  catalog: BasesCatalog,
  options?: BasesToSelectableOptions
): SelectableItem[] {
  const items: SelectableItem[] = [];
  let currentHeader = "";
  const excludeOther = options?.excludeSlotOther === true;
  const excludeSlots = new Set(options?.excludeSlots ?? []);
  const excludeCodes = new Set(options?.excludeCodes ?? []);
  const includeFromOther = new Set(options?.includeCodesFromOther ?? []);

  for (const e of catalog.entries) {
    const entry = e as BasesCatalogEntry;
    if ("kind" in entry && entry.kind === "header") {
      currentHeader = entry.label ?? "";
      continue;
    }
    if (!("code" in entry) || !entry.code) continue;

    const slot = "slot" in entry ? entry.slot : undefined;
    const code = entry.code;
    if (excludeOther && slot === "Other" && !includeFromOther.has(code)) continue;
    if (slot && excludeSlots.has(slot)) continue;
    if (excludeCodes.has(code)) continue;

    const label = entry.label ?? code;
    const quality = "quality" in entry ? entry.quality : undefined;

    items.push({
      code,
      codes: [code],
      label,
      rarity: "unique",
      slot,
      setLabel: currentHeader || undefined,
      quality,
    });
  }

  return items;
}

/** Only bases with slot "Other" (for Misc section). Exclude rune codes via filter in caller. */
export function basesToSelectableItemsOther(
  catalog: BasesCatalog | null
): SelectableItem[] {
  if (!catalog) return [];
  const items: SelectableItem[] = [];
  let currentHeader = "";

  for (const e of catalog.entries) {
    const entry = e as BasesCatalogEntry;
    if ("kind" in entry && entry.kind === "header") {
      currentHeader = entry.label ?? "";
      continue;
    }
    if (!("code" in entry) || !entry.code) continue;

    const slot = "slot" in entry ? entry.slot : undefined;
    if (slot !== "Other") continue;

    const code = entry.code;
    const label = entry.label ?? code;

    items.push({
      code,
      codes: [code],
      label,
      rarity: "unique",
      slot,
      setLabel: currentHeader || undefined,
    });
  }

  return items;
}
