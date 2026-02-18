"use client";

import { useCallback, useMemo, useState } from "react";
import type { SelectableItem } from "@/lib/types";

const ITEM_IMAGE_SIZE = "w-16 h-16";
const ITEM_IMAGE_INNER = "w-12 h-12";

/** Item codes whose downloaded image is wrong. Show placeholder instead. (Antidote yps uses custom yps.png.) */
const ITEM_IMAGE_PLACEHOLDER_CODES = new Set<string>([]);

/** Parse clipboard text into a list of item codes (comma, newline, or whitespace separated). */
function parseCodesFromClipboard(text: string): string[] {
  return text
    .split(/[\s,\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

interface CatalogSectionProps {
  title: string;
  items: SelectableItem[];
  selectedCodes: Set<string>;
  onToggle: (codes: string[]) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  /** When set, show Copy/Paste buttons. Paste calls this with parsed codes from clipboard. */
  onPaste?: (codes: string[]) => void;
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
  /** Base path for item images (e.g. "/item-images"). Image URL: {itemImageBasePath}/{code}.png */
  itemImageBasePath?: string;
  /** Base path for Maxroll images (e.g. "/item-unique" or "/item-set"). When set and item has maxrollId, use {maxrollImageBasePath}/{maxrollId}.webp. */
  maxrollImageBasePath?: string;
  /** Show max sockets metadata for this panel. */
  showMaxSockets?: boolean;
}

export function CatalogSection({
  title,
  items,
  selectedCodes,
  onToggle,
  onSelectAll,
  onClearAll,
  onPaste,
  accentClass,
  borderClass = "border-transparent",
  itemColorClass,
  noContainer,
  sortAlphabetically = true,
  sortBySlotThenLabel = false,
  fillPanel = false,
  itemImageBasePath,
  maxrollImageBasePath,
  showMaxSockets = false,
}: CatalogSectionProps) {
  const [search, setSearch] = useState("");

  const formatQuality = useCallback((quality?: string) => {
    if (!quality) return "";
    if (quality === "hiQuality") return "Superior";
    return quality.charAt(0).toUpperCase() + quality.slice(1);
  }, []);

  const handleCopy = useCallback(async () => {
    const text = Array.from(selectedCodes).sort().join("\n");
    await navigator.clipboard.writeText(text);
  }, [selectedCodes]);

  const handlePaste = useCallback(async () => {
    if (!onPaste) return;
    try {
      const text = await navigator.clipboard.readText();
      const codes = parseCodesFromClipboard(text);
      if (codes.length > 0) onPaste(codes);
    } catch {
      // clipboard read denied or failed
    }
  }, [onPaste]);

  const filtered = useMemo(() => {
    let result = items;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const words = q.split(/\s+/).filter(Boolean);
      result = items.filter((i) => {
        const searchable = [i.label, i.setLabel, i.baseName, i.slot, ...i.codes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return words.every((word) => searchable.includes(word));
      });
    }
    if (sortBySlotThenLabel) {
      const SLOT_ORDER = [
        "Helm",
        "Armor",
        "Weapon",
        "Shield",
        "Gloves",
        "Belt",
        "Boots",
        "Ring",
        "Amulet",
        "Other",
      ];
      const slotRank = (s: string | undefined) => {
        if (!s) return SLOT_ORDER.length;
        const i = SLOT_ORDER.indexOf(s);
        return i >= 0 ? i : SLOT_ORDER.length;
      };
      result = [...result].sort((a, b) => {
        const r = slotRank(a.slot) - slotRank(b.slot);
        if (r !== 0) return r;
        return a.label.localeCompare(b.label, undefined, {
          sensitivity: "base",
        });
      });
    } else if (sortAlphabetically) {
      result = [...result].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
      );
    }
    return result;
  }, [items, search, sortAlphabetically, sortBySlotThenLabel]);

  const selectedCount = items.filter((i) =>
    i.codes.every((c) => selectedCodes.has(c)),
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
        <div className="flex gap-2 mt-2 flex-wrap">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-sm text-zinc-400 hover:text-white focus:outline-none"
          >
            Select all
          </button>
          {onPaste && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="text-sm text-zinc-400 hover:text-white focus:outline-none"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handlePaste}
                className="text-sm text-zinc-400 hover:text-white focus:outline-none"
              >
                Paste
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClearAll}
            className="text-sm text-zinc-400 hover:text-white focus:outline-none"
          >
            Clear
          </button>
        </div>
      </div>
      <ul
        className={`overflow-y-auto p-2 scrollbar-thin flex-1 min-h-0 ${fillPanel ? "pb-4" : ""}`}
      >
        {filtered.length === 0 ? (
          <li className="py-4 text-center text-zinc-500 text-sm">
            {search ? "No items match your search." : "No items."}
          </li>
        ) : (
          filtered.map((item) => {
            const isSelected = item.codes.every((c) => selectedCodes.has(c));
            const rowIdentity = `${title}__${item.code}__${item.setLabel ?? ""}__${item.label}`;
            const id = rowIdentity.replace(/[^a-zA-Z0-9_-]/g, "_");
            const normalizedSetLabel = (item.setLabel ?? "").trim();
            const normalizedSlot = (item.slot ?? "").trim();
            const hasSetLabel =
              normalizedSetLabel.length > 0 &&
              normalizedSetLabel.toLowerCase() !== normalizedSlot.toLowerCase();
            const imageCode = item.imageCode ?? item.codes[0];
            const useMaxroll = Boolean(maxrollImageBasePath && item.maxrollId);
            const fallbackPngPath =
              itemImageBasePath && imageCode
                ? `${itemImageBasePath}/${imageCode}.png`
                : undefined;
            const showImageSlot = useMaxroll || Boolean(fallbackPngPath);
            const usePlaceholder =
              showImageSlot &&
              !useMaxroll &&
              ITEM_IMAGE_PLACEHOLDER_CODES.has(imageCode);
            const imgSrc = useMaxroll
              ? `${maxrollImageBasePath}/${item.maxrollId}.webp`
              : fallbackPngPath;
            const statParts: string[] = [];
            if (
              typeof item.minDefense === "number" &&
              Number.isFinite(item.minDefense) &&
              typeof item.maxDefense === "number" &&
              Number.isFinite(item.maxDefense)
            ) {
              statParts.push(
                item.minDefense === item.maxDefense
                  ? `Def ${item.minDefense}`
                  : `Def ${item.minDefense}-${item.maxDefense}`,
              );
            }
            if (item.oneHandDamage) {
              statParts.push(
                `1H ${item.oneHandDamage.min}-${item.oneHandDamage.max}`,
              );
            }
            if (item.twoHandDamage) {
              statParts.push(
                `2H ${item.twoHandDamage.min}-${item.twoHandDamage.max}`,
              );
            }
            if (item.armorWeightClass) {
              const weightLabel =
                item.armorWeightClass.charAt(0).toUpperCase() +
                item.armorWeightClass.slice(1);
              statParts.push(weightLabel);
            }
            if (
              showMaxSockets &&
              typeof item.maxSockets === "number" &&
              Number.isFinite(item.maxSockets)
            ) {
              statParts.push(`Sockets ${item.maxSockets}`);
            }
            if (
              typeof item.requiredStrength === "number" &&
              Number.isFinite(item.requiredStrength) &&
              item.requiredStrength > 0
            ) {
              statParts.push(`Str ${item.requiredStrength}`);
            }
            if (
              typeof item.requiredDexterity === "number" &&
              Number.isFinite(item.requiredDexterity) &&
              item.requiredDexterity > 0
            ) {
              statParts.push(`Dex ${item.requiredDexterity}`);
            }
            if (
              typeof item.requiredLevel === "number" &&
              Number.isFinite(item.requiredLevel) &&
              item.requiredLevel > 0
            ) {
              statParts.push(`Lvl ${item.requiredLevel}`);
            }
            return (
              <li
                key={rowIdentity}
                className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(item.codes)}
                  className="mt-5 flex-shrink-0 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500 w-4 h-4"
                />
                {showImageSlot && !usePlaceholder && imgSrc ? (
                  <span
                    className={`flex-shrink-0 ${ITEM_IMAGE_SIZE} flex items-center justify-center bg-zinc-800/80 rounded overflow-hidden`}
                  >
                    <img
                      src={imgSrc}
                      alt=""
                      className={`${ITEM_IMAGE_INNER} object-contain`}
                      data-fallback-base={
                        item.imageCode &&
                        item.codes[0] &&
                        item.imageCode !== item.codes[0]
                          ? item.codes[0]
                          : undefined
                      }
                      data-base-path={itemImageBasePath}
                      onError={(e) => {
                        const img = e.currentTarget;
                        const fallback = img.getAttribute("data-fallback-base");
                        const basePath = img.getAttribute("data-base-path");
                        if (
                          fallback &&
                          basePath &&
                          !img.src.includes(`/${fallback}.png`)
                        ) {
                          img.src = `${basePath}/${fallback}.png`;
                          return;
                        }
                        img.style.display = "none";
                        const placeholder = img.nextElementSibling;
                        if (placeholder)
                          (placeholder as HTMLElement).style.display = "flex";
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
                  className={`flex-1 cursor-pointer select-none min-w-0 ${itemColorClass}`}
                  title={
                    item.setLabel
                      ? `${item.setLabel} – ${item.label}`
                      : item.label
                  }
                >
                  <span
                    className={`block text-lg leading-tight font-semibold truncate ${hasSetLabel ? "opacity-95" : ""}`}
                  >
                    {item.label}
                  </span>
                  <div className="mt-0.5 text-sm text-zinc-400 truncate">
                    {statParts.length > 0 ? (
                      <span className="text-zinc-500">
                        {statParts.join(" · ")}
                      </span>
                    ) : (
                      <span className="text-zinc-600">No base stats</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500 flex items-center gap-1.5 flex-wrap">
                    {item.slot && <span>{item.slot}</span>}
                    {item.quality && (
                      <>
                        {item.slot && <span className="text-zinc-700">·</span>}
                        <span>{formatQuality(item.quality)}</span>
                      </>
                    )}
                    {hasSetLabel && (
                      <>
                        {(item.slot || item.quality) && (
                          <span className="text-zinc-700">·</span>
                        )}
                        <span className="truncate max-w-[260px]">
                          {normalizedSetLabel}
                        </span>
                      </>
                    )}
                  </div>
                </label>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
