import type { MiscCatalog, MiscCatalogEntry, SelectableItem } from "./types";

/** Flatten misc catalog to selectable items. Headers provide setLabel (category) for items below. */
export function miscToSelectableItems(catalog: MiscCatalog | null): SelectableItem[] {
  if (!catalog) return [];
  const items: SelectableItem[] = [];
  let currentHeader = "";

  for (const e of catalog.entries) {
    const entry = e as MiscCatalogEntry;
    if ("kind" in entry && entry.kind === "header") {
      currentHeader = entry.label ?? "";
      continue;
    }
    if (!("code" in entry) || !entry.code) continue;

    items.push({
      code: entry.code,
      codes: [entry.code],
      label: entry.label ?? entry.code,
      rarity: "unique" as const,
      slot: entry.slot,
      setLabel: currentHeader || undefined,
    });
  }

  return items;
}
