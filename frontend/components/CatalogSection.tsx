"use client";

import { useMemo, useState } from "react";
import type { SelectableItem } from "@/lib/types";

const ITEM_IMAGE_SIZE = "w-12 h-12";
const ITEM_IMAGE_INNER = "w-11 h-11";

/** Item codes whose downloaded image is wrong. Show placeholder instead. (Antidote yps uses custom yps.png.) */
const ITEM_IMAGE_PLACEHOLDER_CODES = new Set<string>([]);

interface CatalogSectionProps {
  title: string;
  items: SelectableItem[];
  selectedCodes: Set<string>;
  onToggle: (codes: string[]) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  accentClass: string;
  borderClass?: string;
  /** Class for item label text (e.g. text-d2-set, text-d2-unique) */
  itemColorClass: string;
  /** If true, no card container (border/background) */
  noContainer?: boolean;
  /** If false, preserve item order (e.g. runes). Default true = sort alphabetically. */
  sortAlphabetically?: boolean;
  /** If true, sort by slot first, then alphabetically by label. */
  sortBySlotThenLabel?: boolean;
  /** If true, fill available height (for tab panel). */
  fillPanel?: boolean;
  /** Base path for item images (e.g. "/item-images" or "/D2RLootFilters/item-images"). Image URL: {itemImageBasePath}/{code}.png */
  itemImageBasePath?: string;
}

export function CatalogSection({
  title,
  items,
  selectedCodes,
  onToggle,
  onSelectAll,
  onClearAll,
  accentClass,
  borderClass = "border-transparent",
  itemColorClass,
  noContainer,
  sortAlphabetically = true,
  sortBySlotThenLabel = false,
  fillPanel = false,
  itemImageBasePath,
}: CatalogSectionProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = items;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = items.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.codes.some((c) => c.toLowerCase().includes(q)) ||
          (i.setLabel?.toLowerCase().includes(q) ?? false) ||
          (i.slot?.toLowerCase().includes(q) ?? false)
      );
    }
    if (sortBySlotThenLabel) {
      const SLOT_ORDER = ["Helm", "Armor", "Weapon", "Shield", "Gloves", "Belt", "Boots", "Ring", "Amulet", "Other"];
      const slotRank = (s: string | undefined) => {
        if (!s) return SLOT_ORDER.length;
        const i = SLOT_ORDER.indexOf(s);
        return i >= 0 ? i : SLOT_ORDER.length;
      };
      result = [...result].sort((a, b) => {
        const r = slotRank(a.slot) - slotRank(b.slot);
        if (r !== 0) return r;
        return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
      });
    } else if (sortAlphabetically) {
      result = [...result].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
      );
    }
    return result;
  }, [items, search, sortAlphabetically, sortBySlotThenLabel]);

  const selectedCount = items.filter((i) =>
    i.codes.every((c) => selectedCodes.has(c))
  ).length;

  const sectionClass = noContainer
    ? `flex flex-col ${fillPanel ? "flex-1 min-h-0 overflow-hidden" : "max-h-[70vh] pb-6"}` 
    : `rounded-xl border ${borderClass} bg-zinc-900/50 overflow-hidden flex flex-col ${fillPanel ? "flex-1 min-h-0" : "max-h-[70vh]"}`;

  return (
    <section className={sectionClass}>
      <div className="p-2 sm:p-4 border-b border-zinc-700/50 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className={`font-semibold text-lg ${accentClass}`}>{title}</h2>
          <span className="text-sm text-zinc-500">
            {selectedCount} / {items.length}
          </span>
        </div>
        <input
          type="search"
          placeholder="Search by name, code, set, slot…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
        />
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-sm text-zinc-400 hover:text-white focus:outline-none"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="text-sm text-zinc-400 hover:text-white focus:outline-none"
          >
            Clear
          </button>
        </div>
      </div>
      <ul className={`overflow-y-auto p-2 scrollbar-thin flex-1 min-h-0 ${fillPanel ? "pb-4" : ""}`}>
        {filtered.length === 0 ? (
          <li className="py-4 text-center text-zinc-500 text-sm">
            {search ? "No items match your search." : "No items."}
          </li>
        ) : (
          filtered.map((item) => {
            const isSelected = item.codes.every((c) => selectedCodes.has(c));
            const id = `${title}-${item.code}`;
            const imageCode = item.imageCode ?? item.codes[0];
            const showImageSlot = Boolean(itemImageBasePath && imageCode);
            const usePlaceholder = showImageSlot && ITEM_IMAGE_PLACEHOLDER_CODES.has(imageCode);
            return (
              <li key={item.code} className="flex items-center gap-3 py-2 px-2 rounded hover:bg-zinc-800/50">
                <input
                  id={id}
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(item.codes)}
                  className="flex-shrink-0 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500 w-4 h-4"
                />
                {showImageSlot && !usePlaceholder ? (
                  <span className={`flex-shrink-0 ${ITEM_IMAGE_SIZE} flex items-center justify-center bg-zinc-800/80 rounded overflow-hidden`}>
                    <img
                      src={`${itemImageBasePath}/${imageCode}.png`}
                      alt=""
                      className={`${ITEM_IMAGE_INNER} object-contain`}
                      data-fallback-base={item.imageCode && item.codes[0] && item.imageCode !== item.codes[0] ? item.codes[0] : undefined}
                      data-base-path={itemImageBasePath}
                      onError={(e) => {
                        const img = e.currentTarget;
                        const fallback = img.getAttribute("data-fallback-base");
                        const basePath = img.getAttribute("data-base-path");
                        if (fallback && basePath && !img.src.includes(`/${fallback}.png`)) {
                          img.src = `${basePath}/${fallback}.png`;
                          return;
                        }
                        img.style.display = "none";
                        const placeholder = img.nextElementSibling;
                        if (placeholder) (placeholder as HTMLElement).style.display = "flex";
                      }}
                    />
                    <span
                      className="hidden w-full h-full items-center justify-center bg-zinc-700/80 text-zinc-500 text-sm"
                      aria-hidden
                    >
                      ?
                    </span>
                  </span>
                ) : showImageSlot && usePlaceholder ? (
                  <span
                    className={`flex-shrink-0 ${ITEM_IMAGE_SIZE} flex items-center justify-center bg-zinc-700/80 rounded text-zinc-500 text-sm`}
                    aria-hidden
                    title="Image not available (wrong asset)"
                  >
                    ?
                  </span>
                ) : itemImageBasePath ? (
                  <span
                    className={`flex-shrink-0 ${ITEM_IMAGE_SIZE} flex items-center justify-center bg-zinc-700/80 rounded text-zinc-500 text-sm`}
                    aria-hidden
                    title="No image"
                  >
                    ?
                  </span>
                ) : null}
                <label
                  htmlFor={id}
                  className={`flex-1 text-lg cursor-pointer select-none truncate min-w-0 ${itemColorClass}`}
                  title={item.setLabel ? `${item.setLabel} – ${item.label}` : item.label}
                >
                  {item.setLabel && (
                    <span className="text-zinc-500 text-base block truncate">
                      {item.setLabel}
                    </span>
                  )}
                  <span className={item.setLabel ? "opacity-90" : ""}>
                    {item.label}
                  </span>
                  {(item.quality ?? item.slot) && (
                    <span className="opacity-70 ml-1 text-base">
                      ({item.quality ? item.quality.charAt(0).toUpperCase() + item.quality.slice(1) : item.slot})
                    </span>
                  )}
                </label>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
