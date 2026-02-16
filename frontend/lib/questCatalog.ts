import type { QuestCatalog, QuestCatalogEntry, SelectableItem } from "./types";

/** Flatten quest catalog to selectable items. Headers provide setLabel (category) for items below. */
export function questToSelectableItems(
  catalog: QuestCatalog | null
): SelectableItem[] {
  if (!catalog) return [];
  const items: SelectableItem[] = [];
  let currentHeader = "";

  for (const e of catalog.entries) {
    const entry = e as QuestCatalogEntry;
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
