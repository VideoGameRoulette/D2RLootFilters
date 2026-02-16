import type { Catalog, CatalogEntry, SelectableItem } from "./types";

/** Strip leading "U " from unique item labels for easier searching. */
function displayLabel(label: string, rarity: "set" | "unique"): string {
  if (rarity === "unique" && /^\s*U\s+/i.test(label)) {
    return label.replace(/^\s*U\s+/i, "").trim();
  }
  return label;
}

/** Custom label for codes we explicitly merge (rings, amulets, jewels, charms). Returns undefined for others. */
const MERGED_CODE_LABELS: Record<string, string> = {
  rin: "Rings",
  amu: "Amulets",
  jew: "Jewels",
  cjw: "Colossal Jewels",
  cm1: "Small Charms",
  cm2: "Large Charms",
  cm3: "Grand Charms",
};

/** Flatten catalog: for sets, one row per piece. For uniques, merge entries that share the same code (rings, amulets, jewels, etc.). */
export function catalogToSelectableItems(
  catalog: Catalog,
  rarity: "set" | "unique"
): SelectableItem[] {
  const items: SelectableItem[] = [];
  let currentHeader = "";

  if (rarity === "unique") {
    for (const e of catalog.entries) {
      const entry = e as CatalogEntry;
      if (!("rarity" in entry) || entry.rarity !== "unique") continue;
      const rawCodes = Array.isArray(entry.code) ? entry.code : [entry.code];
      const baseCode = rawCodes.find((c): c is string => Boolean(c));
      if (!baseCode) continue;
      const rawLabel = entry.label ?? "";
      const label = displayLabel(rawLabel, "unique");
      const slot = "slot" in entry ? entry.slot : undefined;
      const baseName = "baseName" in entry ? entry.baseName : undefined;
      const imageCode = "imageCode" in entry ? entry.imageCode : undefined;
      items.push({
        code: `${baseCode}|${label}`,
        codes: [baseCode],
        label,
        rarity: "unique",
        slot,
        setLabel: baseName,
        imageCode,
      });
    }
    return items;
  }

  for (const e of catalog.entries) {
    const entry = e as CatalogEntry;
    if ("kind" in entry && entry.kind === "header") {
      currentHeader = entry.label ?? "";
      continue;
    }
    if (!("rarity" in entry) || entry.rarity !== rarity) continue;

    const rawCodes = Array.isArray(entry.code) ? entry.code : [entry.code];
    const codes = rawCodes.filter((c): c is string => Boolean(c));
    if (codes.length === 0) continue;

    const rawLabel = entry.label ?? "";
    const label = displayLabel(rawLabel, rarity);
    const slot = "slot" in entry ? entry.slot : undefined;
    const setLabel = currentHeader || undefined;

    if (slot === "Set" || codes.length > 1) continue;

    items.push({ code: codes[0], codes: [codes[0]], label, rarity, slot, setLabel });
  }

  return items;
}
