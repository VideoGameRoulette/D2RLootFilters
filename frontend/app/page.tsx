"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Catalog, SelectableItem } from "@/lib/types";
import { catalogToSelectableItems } from "@/lib/catalog";
import {
  buildFilterFromSelection,
  serializeFilter,
} from "@/lib/buildFilter";
import { RUNES } from "@/lib/runes";
import { MISC_ITEMS } from "@/lib/misc";
import { categorizeMisc } from "@/lib/miscCategories";
import {
  basesToSelectableItems,
  basesToSelectableItemsOther,
} from "@/lib/basesCatalog";
import { gemsToSelectableItems } from "@/lib/gemsCatalog";
import { potionsToSelectableItems } from "@/lib/potionsCatalog";
import { questToSelectableItems } from "@/lib/questCatalog";
import { CatalogSection } from "@/components/CatalogSection";
import { CatalogTabs } from "@/components/CatalogTabs";
import type { BasesCatalog, EquipmentQuality, GemsCatalog, PotionsCatalog, QuestCatalog } from "@/lib/types";

const QUALITIES: EquipmentQuality[] = ["normal", "exceptional", "elite"];

const TAB_ORDER = [
  "normal",
  "socketedEthereal",
  "magic",
  "rare",
  "unique",
  "sets",
  "runes",
  "gems",
  "potions",
  "quest",
  "misc",
  "gold",
] as const;

export default function Home() {
  const [setsCatalog, setSetsCatalog] = useState<Catalog | null>(null);
  const [uniquesCatalog, setUniquesCatalog] = useState<Catalog | null>(null);
  const [profileName, setProfileName] = useState("MyFilter");
  const [selectedSetCodes, setSelectedSetCodes] = useState<Set<string>>(
    new Set()
  );
  const [selectedUniqueCodes, setSelectedUniqueCodes] = useState<Set<string>>(
    new Set()
  );
  const [selectedRuneCodes, setSelectedRuneCodes] = useState<Set<string>>(
    new Set()
  );
  const [basesCatalog, setBasesCatalog] = useState<BasesCatalog | null>(null);
  const [gemsCatalog, setGemsCatalog] = useState<GemsCatalog | null>(null);
  const [potionsCatalog, setPotionsCatalog] = useState<PotionsCatalog | null>(null);
  const [questCatalog, setQuestCatalog] = useState<QuestCatalog | null>(null);
  const [selectedNormalBaseCodes, setSelectedNormalBaseCodes] = useState<
    Set<string>
  >(new Set());
  const [selectedSocketedEtherealBaseCodes, setSelectedSocketedEtherealBaseCodes] =
    useState<Set<string>>(new Set());
  const [selectedMagicBaseCodes, setSelectedMagicBaseCodes] = useState<
    Set<string>
  >(new Set());
  const [selectedRareBaseCodes, setSelectedRareBaseCodes] = useState<
    Set<string>
  >(new Set());
  const [selectedGemCodes, setSelectedGemCodes] = useState<Set<string>>(
    new Set()
  );
  const [selectedPotionCodes, setSelectedPotionCodes] = useState<Set<string>>(
    new Set()
  );
  const [selectedQuestCodes, setSelectedQuestCodes] = useState<Set<string>>(
    new Set()
  );
  const [selectedMiscOtherCodes, setSelectedMiscOtherCodes] = useState<
    Set<string>
  >(new Set());
  const [goldFilterEnabled, setGoldFilterEnabled] = useState(false);
  const [goldFilterThreshold, setGoldFilterThreshold] = useState(5000);
  const [baseQualityFilter, setBaseQualityFilter] = useState<Set<EquipmentQuality>>(
    () => new Set(QUALITIES)
  );
  const [activeTab, setActiveTab] = useState<string>(TAB_ORDER[0]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/catalog.sets.json").then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("Sets catalog not found"))
      ),
      fetch("/data/catalog.uniques.json").then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("Uniques catalog not found"))
      ),
      fetch("/data/catalog.bases.json")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/data/catalog.gems.json")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/data/catalog.potions.json")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/data/catalog.quest.json")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([sets, uniques, bases, gems, potions, quest]) => {
        setSetsCatalog(sets);
        setUniquesCatalog(uniques);
        setBasesCatalog(bases ?? null);
        setGemsCatalog(gems ?? null);
        setPotionsCatalog(potions ?? null);
        setQuestCatalog(quest ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const setItems = useMemo<SelectableItem[]>(
    () => (setsCatalog ? catalogToSelectableItems(setsCatalog, "set") : []),
    [setsCatalog]
  );
  const uniqueItems = useMemo<SelectableItem[]>(
    () =>
      uniquesCatalog ? catalogToSelectableItems(uniquesCatalog, "unique") : [],
    [uniquesCatalog]
  );

  const runeItems = useMemo<SelectableItem[]>(
    () =>
      RUNES.map((r) => ({
        code: r.code,
        codes: [r.code],
        label: r.name,
        rarity: "unique" as const,
      })),
    []
  );

  const runeCodeSet = useMemo(
    () => new Set(RUNES.map((r) => r.code)),
    []
  );

  const charmCodeSet = useMemo(
    () => new Set(["cm1", "cm2", "cm3"]),
    []
  ); // Small, Large, Grand charms - Magic only (no rare charms in D2)

  const jewelCodeSet = useMemo(() => new Set(["jew", "cjw"]), []); // Exclude from misc (cjw in Gems, jew in Magic/Rare)

  const baseItems = useMemo<SelectableItem[]>(
    () =>
      basesCatalog
        ? basesToSelectableItems(basesCatalog, {
            excludeSlotOther: true,
            excludeCodes: ["vip"], // Amulet of the Viper - quest drop, unique
            includeCodesFromOther: ["cm1", "cm2", "cm3", "jew"], // Charms + Jewel (Colossal in Gems only)
          })
        : [],
    [basesCatalog]
  );

  const baseItemsRare = useMemo<SelectableItem[]>(
    () =>
      basesCatalog
        ? basesToSelectableItems(basesCatalog, {
            excludeSlotOther: true,
            excludeCodes: ["vip", "cm1", "cm2", "cm3"], // No charms - magic/unique only
            includeCodesFromOther: ["jew"], // Jewel in Rare (Colossal in Gems only)
          })
        : [],
    [basesCatalog]
  );

  const baseItemsNormal = useMemo<SelectableItem[]>(
    () =>
      basesCatalog
        ? basesToSelectableItems(basesCatalog, {
            excludeSlotOther: true,
            excludeSlots: ["Ring", "Amulet"],
          })
        : [],
    [basesCatalog]
  );

  const filterBasesByQuality = useCallback(
    (items: SelectableItem[]) =>
      items.filter(
        (i) => !i.quality || baseQualityFilter.has(i.quality)
      ),
    [baseQualityFilter]
  );

  const baseItemsNormalFiltered = useMemo(
    () => filterBasesByQuality(baseItemsNormal),
    [filterBasesByQuality, baseItemsNormal]
  );
  const baseItemsFiltered = useMemo(
    () => filterBasesByQuality(baseItems),
    [filterBasesByQuality, baseItems]
  );
  const baseItemsRareFiltered = useMemo(
    () => filterBasesByQuality(baseItemsRare),
    [filterBasesByQuality, baseItemsRare]
  );

  const toggleBaseQuality = useCallback((q: EquipmentQuality) => {
    setBaseQualityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });
  }, []);

  const miscItemsRaw = useMemo<SelectableItem[]>(() => {
    const otherBases = basesToSelectableItemsOther(basesCatalog);
    const withoutRunesOrCharms = otherBases.filter(
      (item) => !runeCodeSet.has(item.code) && !charmCodeSet.has(item.code)
    );
    return [...MISC_ITEMS, ...withoutRunesOrCharms];
  }, [basesCatalog, runeCodeSet, charmCodeSet]);

  const gemItems = useMemo(
    () => gemsToSelectableItems(gemsCatalog),
    [gemsCatalog]
  );
  const potionItems = useMemo(
    () => potionsToSelectableItems(potionsCatalog),
    [potionsCatalog]
  );
  const questItems = useMemo(
    () => questToSelectableItems(questCatalog),
    [questCatalog]
  );
  const { other: miscOtherRaw } = useMemo(
    () => categorizeMisc(miscItemsRaw),
    [miscItemsRaw]
  );

  const miscOtherItems = useMemo(
    () => miscOtherRaw.filter((item) => !jewelCodeSet.has(item.code)),
    [miscOtherRaw, jewelCodeSet]
  );

  const toggleSet = useCallback((codes: string[]) => {
    setSelectedSetCodes((prev) => {
      const next = new Set(prev);
      const allSelected = codes.every((c) => next.has(c));
      if (allSelected) codes.forEach((c) => next.delete(c));
      else codes.forEach((c) => next.add(c));
      return next;
    });
  }, []);

  const toggleUnique = useCallback((codes: string[]) => {
    setSelectedUniqueCodes((prev) => {
      const next = new Set(prev);
      const allSelected = codes.every((c) => next.has(c));
      if (allSelected) codes.forEach((c) => next.delete(c));
      else codes.forEach((c) => next.add(c));
      return next;
    });
  }, []);

  const selectAllSet = useCallback(() => {
    setSelectedSetCodes(new Set(setItems.flatMap((i) => i.codes)));
  }, [setItems]);

  const clearAllSet = useCallback(() => {
    setSelectedSetCodes(new Set());
  }, []);

  const selectAllUnique = useCallback(() => {
    setSelectedUniqueCodes(new Set(uniqueItems.flatMap((i) => i.codes)));
  }, [uniqueItems]);

  const clearAllUnique = useCallback(() => {
    setSelectedUniqueCodes(new Set());
  }, []);

  const toggleRune = useCallback((codes: string[]) => {
    setSelectedRuneCodes((prev) => {
      const next = new Set(prev);
      const allSelected = codes.every((c) => next.has(c));
      if (allSelected) codes.forEach((c) => next.delete(c));
      else codes.forEach((c) => next.add(c));
      return next;
    });
  }, []);

  const selectAllRunes = useCallback(() => {
    setSelectedRuneCodes(new Set(runeItems.flatMap((i) => i.codes)));
  }, [runeItems]);

  const clearAllRunes = useCallback(() => {
    setSelectedRuneCodes(new Set());
  }, []);

  const toggleNormalBase = useCallback((codes: string[]) => {
    setSelectedNormalBaseCodes((prev) => {
      const next = new Set(prev);
      const allSelected = codes.every((c) => next.has(c));
      if (allSelected) codes.forEach((c) => next.delete(c));
      else codes.forEach((c) => next.add(c));
      return next;
    });
  }, []);
  const toggleSocketedEtherealBase = useCallback((codes: string[]) => {
    setSelectedSocketedEtherealBaseCodes((prev) => {
      const next = new Set(prev);
      const allSelected = codes.every((c) => next.has(c));
      if (allSelected) codes.forEach((c) => next.delete(c));
      else codes.forEach((c) => next.add(c));
      return next;
    });
  }, []);
  const toggleMagicBase = useCallback((codes: string[]) => {
    setSelectedMagicBaseCodes((prev) => {
      const next = new Set(prev);
      const allSelected = codes.every((c) => next.has(c));
      if (allSelected) codes.forEach((c) => next.delete(c));
      else codes.forEach((c) => next.add(c));
      return next;
    });
  }, []);
  const toggleRareBase = useCallback((codes: string[]) => {
    setSelectedRareBaseCodes((prev) => {
      const next = new Set(prev);
      const allSelected = codes.every((c) => next.has(c));
      if (allSelected) codes.forEach((c) => next.delete(c));
      else codes.forEach((c) => next.add(c));
      return next;
    });
  }, []);

  const selectAllNormalBases = useCallback(() => {
    setSelectedNormalBaseCodes(new Set(baseItemsNormalFiltered.flatMap((i) => i.codes)));
  }, [baseItemsNormalFiltered]);
  const selectAllSocketedEtherealBases = useCallback(() => {
    setSelectedSocketedEtherealBaseCodes(
      new Set(baseItemsNormalFiltered.flatMap((i) => i.codes))
    );
  }, [baseItemsNormalFiltered]);
  const selectAllMagicBases = useCallback(() => {
    setSelectedMagicBaseCodes(new Set(baseItemsFiltered.flatMap((i) => i.codes)));
  }, [baseItemsFiltered]);
  const selectAllRareBases = useCallback(() => {
    setSelectedRareBaseCodes(new Set(baseItemsRareFiltered.flatMap((i) => i.codes)));
  }, [baseItemsRareFiltered]);

  const clearAllNormalBases = useCallback(() => setSelectedNormalBaseCodes(new Set()), []);
  const clearAllSocketedEtherealBases = useCallback(
    () => setSelectedSocketedEtherealBaseCodes(new Set()),
    []
  );
  const clearAllMagicBases = useCallback(() => setSelectedMagicBaseCodes(new Set()), []);
  const clearAllRareBases = useCallback(() => setSelectedRareBaseCodes(new Set()), []);

  const toggleGem = useCallback((codes: string[]) => {
    setSelectedGemCodes((prev) => {
      const next = new Set(prev);
      const allSelected = codes.every((c) => next.has(c));
      if (allSelected) codes.forEach((c) => next.delete(c));
      else codes.forEach((c) => next.add(c));
      return next;
    });
  }, []);
  const selectAllGems = useCallback(
    () => setSelectedGemCodes(new Set(gemItems.flatMap((i) => i.codes))),
    [gemItems]
  );
  const clearAllGems = useCallback(() => setSelectedGemCodes(new Set()), []);

  const togglePotion = useCallback((codes: string[]) => {
    setSelectedPotionCodes((prev) => {
      const next = new Set(prev);
      const allSelected = codes.every((c) => next.has(c));
      if (allSelected) codes.forEach((c) => next.delete(c));
      else codes.forEach((c) => next.add(c));
      return next;
    });
  }, []);
  const selectAllPotions = useCallback(
    () => setSelectedPotionCodes(new Set(potionItems.flatMap((i) => i.codes))),
    [potionItems]
  );
  const clearAllPotions = useCallback(() => setSelectedPotionCodes(new Set()), []);

  const toggleQuest = useCallback((codes: string[]) => {
    setSelectedQuestCodes((prev) => {
      const next = new Set(prev);
      const allSelected = codes.every((c) => next.has(c));
      if (allSelected) codes.forEach((c) => next.delete(c));
      else codes.forEach((c) => next.add(c));
      return next;
    });
  }, []);
  const selectAllQuest = useCallback(
    () => setSelectedQuestCodes(new Set(questItems.flatMap((i) => i.codes))),
    [questItems]
  );
  const clearAllQuest = useCallback(() => setSelectedQuestCodes(new Set()), []);

  const toggleMiscOther = useCallback((codes: string[]) => {
    setSelectedMiscOtherCodes((prev) => {
      const next = new Set(prev);
      const allSelected = codes.every((c) => next.has(c));
      if (allSelected) codes.forEach((c) => next.delete(c));
      else codes.forEach((c) => next.add(c));
      return next;
    });
  }, []);
  const selectAllMiscOther = useCallback(
    () =>
      setSelectedMiscOtherCodes(new Set(miscOtherItems.flatMap((i) => i.codes))),
    [miscOtherItems]
  );
  const clearAllMiscOther = useCallback(
    () => setSelectedMiscOtherCodes(new Set()),
    []
  );

  const miscCodesMerged = useMemo(
    () => [
      ...Array.from(selectedGemCodes),
      ...Array.from(selectedPotionCodes),
      ...Array.from(selectedQuestCodes),
      ...Array.from(selectedMiscOtherCodes),
    ],
    [selectedGemCodes, selectedPotionCodes, selectedQuestCodes, selectedMiscOtherCodes]
  );

  const getExportJson = useCallback(() => {
    const profile = profileName.replace(/\s/g, "") || "LootFilter";
    const filter = buildFilterFromSelection(
      profile,
      Array.from(selectedSetCodes),
      Array.from(selectedUniqueCodes),
      Array.from(selectedRuneCodes),
      Array.from(selectedNormalBaseCodes),
      Array.from(selectedMagicBaseCodes),
      Array.from(selectedRareBaseCodes),
      miscCodesMerged,
      Array.from(selectedSocketedEtherealBaseCodes),
      goldFilterEnabled ? { enabled: true, threshold: goldFilterThreshold } : undefined
    );
    return serializeFilter(filter, false);
  }, [
    profileName,
    selectedSetCodes,
    selectedUniqueCodes,
    selectedRuneCodes,
    selectedNormalBaseCodes,
    selectedMagicBaseCodes,
    selectedRareBaseCodes,
    miscCodesMerged,
    selectedSocketedEtherealBaseCodes,
    goldFilterEnabled,
    goldFilterThreshold,
  ]);

  const handleExportJson = useCallback(() => {
    const profile = profileName.replace(/\s/g, "") || "LootFilter";
    const json = getExportJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lootfilter-${profile}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [profileName, getExportJson]);

  const handleCopyToClipboard = useCallback(async () => {
    const json = getExportJson();
    try {
      await navigator.clipboard.writeText(json);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      setCopyFeedback(false);
    }
  }, [getExportJson]);

  const totalSelected =
    selectedSetCodes.size +
    selectedUniqueCodes.size +
    selectedRuneCodes.size +
    selectedNormalBaseCodes.size +
    selectedSocketedEtherealBaseCodes.size +
    selectedMagicBaseCodes.size +
    selectedRareBaseCodes.size +
    selectedGemCodes.size +
    selectedPotionCodes.size +
    selectedQuestCodes.size +
    selectedMiscOtherCodes.size;
  const canExport = totalSelected > 0 || goldFilterEnabled;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-zinc-400">Loading catalogs…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <p className="text-amber-400 mb-2">{error}</p>
          <p className="text-sm text-zinc-500">
            Run <code className="bg-zinc-800 px-1 rounded">node copy-catalogs.mjs</code> from the{" "}
            <code className="bg-zinc-800 px-1 rounded">frontend</code> folder (after building catalogs in the repo root).
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden flex flex-col">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 md:p-6 lg:p-8 w-full">
        <header className="mb-6 flex-shrink-0">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            D2R Loot Filter Builder - Last Update: 2026-02-14 - Game Version: v3.1.91636
          </h1>
          <p className="text-zinc-400 mt-1">
            Select normal, magic, rare, unique, sets, runes, and misc. Export a single JSON filter for in-game Import from Clipboard.
          </p>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-4 flex-shrink-0">
          <label className="flex items-center gap-2">
            <span className="text-zinc-400 text-sm">Profile name (no spaces):</span>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="MyFilter"
              className="bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 max-w-[200px]"
            />
          </label>
          <div className="text-sm text-zinc-500">
            Selected: N {selectedNormalBaseCodes.size} · S/E {selectedSocketedEtherealBaseCodes.size} · M {selectedMagicBaseCodes.size} · R {selectedRareBaseCodes.size} · U {selectedUniqueCodes.size} · S {selectedSetCodes.size} · Runes {selectedRuneCodes.size} · G {selectedGemCodes.size} · Pot {selectedPotionCodes.size} · Q {selectedQuestCodes.size} · Misc {selectedMiscOtherCodes.size}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden mb-6">
          <CatalogTabs
            tabs={[
              {
                id: "normal",
                label: "Normal",
                count: baseItemsNormal.length,
                selectedCount: selectedNormalBaseCodes.size,
                accentClass: "text-d2-normal",
              },
              {
                id: "socketedEthereal",
                label: "Socketed / Ethereal",
                count: baseItemsNormal.length,
                selectedCount: selectedSocketedEtherealBaseCodes.size,
                accentClass: "text-d2-normal",
              },
              {
                id: "magic",
                label: "Magic",
                count: baseItems.length,
                selectedCount: selectedMagicBaseCodes.size,
                accentClass: "text-d2-magic",
              },
              {
                id: "rare",
                label: "Rare",
                count: baseItemsRare.length,
                selectedCount: selectedRareBaseCodes.size,
                accentClass: "text-d2-rare",
              },
              {
                id: "unique",
                label: "Unique",
                count: uniqueItems.length,
                selectedCount: selectedUniqueCodes.size,
                accentClass: "text-d2-unique",
              },
              {
                id: "sets",
                label: "Sets",
                count: setItems.length,
                selectedCount: selectedSetCodes.size,
                accentClass: "text-d2-set",
              },
              {
                id: "runes",
                label: "Runes",
                count: runeItems.length,
                selectedCount: selectedRuneCodes.size,
                accentClass: "text-d2-crafted",
              },
              {
                id: "gems",
                label: "Gems",
                count: gemItems.length,
                selectedCount: selectedGemCodes.size,
                accentClass: "text-zinc-400",
              },
              {
                id: "potions",
                label: "Potions",
                count: potionItems.length,
                selectedCount: selectedPotionCodes.size,
                accentClass: "text-zinc-400",
              },
              {
                id: "quest",
                label: "Quest",
                count: questItems.length,
                selectedCount: selectedQuestCodes.size,
                accentClass: "text-d2-quest",
              },
              {
                id: "misc",
                label: "Misc",
                count: miscOtherItems.length,
                selectedCount: selectedMiscOtherCodes.size,
                accentClass: "text-zinc-400",
              },
              {
                id: "gold",
                label: "Gold",
                count: 1,
                selectedCount: goldFilterEnabled ? 1 : 0,
                accentClass: "text-d2-gold",
              },
            ]}
            activeTabId={activeTab}
            onTabChange={setActiveTab}
          >
            {activeTab === "normal" && (
              <>
                <div className="flex flex-wrap items-center gap-4 mb-3 flex-shrink-0">
                  <span className="text-sm text-zinc-400">Filter by tier:</span>
                  {QUALITIES.map((q) => (
                    <label key={q} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={baseQualityFilter.has(q)}
                        onChange={() => toggleBaseQuality(q)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900"
                      />
                      <span className="text-sm text-zinc-300 capitalize">{q}</span>
                    </label>
                  ))}
                </div>
                <CatalogSection
                  title="Normal"
                  items={baseItemsNormalFiltered}
                  selectedCodes={selectedNormalBaseCodes}
                  onToggle={toggleNormalBase}
                  onSelectAll={selectAllNormalBases}
                  onClearAll={clearAllNormalBases}
                  accentClass="text-d2-normal"
                  itemColorClass="text-d2-normal"
                  noContainer
                  fillPanel
                />
              </>
            )}
            {activeTab === "socketedEthereal" && (
              <>
                <div className="flex flex-wrap items-center gap-4 mb-3 flex-shrink-0">
                  <span className="text-sm text-zinc-400">Filter by tier:</span>
                  {QUALITIES.map((q) => (
                    <label key={q} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={baseQualityFilter.has(q)}
                        onChange={() => toggleBaseQuality(q)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900"
                      />
                      <span className="text-sm text-zinc-300 capitalize">{q}</span>
                    </label>
                  ))}
                </div>
                <CatalogSection
                  title="Socketed / Ethereal"
                  items={baseItemsNormalFiltered}
                  selectedCodes={selectedSocketedEtherealBaseCodes}
                  onToggle={toggleSocketedEtherealBase}
                  onSelectAll={selectAllSocketedEtherealBases}
                  onClearAll={clearAllSocketedEtherealBases}
                  accentClass="text-d2-normal"
                  itemColorClass="text-d2-normal"
                  noContainer
                  fillPanel
                />
              </>
            )}
            {activeTab === "magic" && (
              <>
                <div className="flex flex-wrap items-center gap-4 mb-3 flex-shrink-0">
                  <span className="text-sm text-zinc-400">Filter by tier:</span>
                  {QUALITIES.map((q) => (
                    <label key={q} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={baseQualityFilter.has(q)}
                        onChange={() => toggleBaseQuality(q)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900"
                      />
                      <span className="text-sm text-zinc-300 capitalize">{q}</span>
                    </label>
                  ))}
                </div>
                <CatalogSection
                  title="Magic"
                  items={baseItemsFiltered}
                  selectedCodes={selectedMagicBaseCodes}
                  onToggle={toggleMagicBase}
                  onSelectAll={selectAllMagicBases}
                  onClearAll={clearAllMagicBases}
                  accentClass="text-d2-magic"
                  itemColorClass="text-d2-magic"
                  noContainer
                  fillPanel
                />
              </>
            )}
            {activeTab === "rare" && (
              <>
                <div className="flex flex-wrap items-center gap-4 mb-3 flex-shrink-0">
                  <span className="text-sm text-zinc-400">Filter by tier:</span>
                  {QUALITIES.map((q) => (
                    <label key={q} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={baseQualityFilter.has(q)}
                        onChange={() => toggleBaseQuality(q)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900"
                      />
                      <span className="text-sm text-zinc-300 capitalize">{q}</span>
                    </label>
                  ))}
                </div>
                <CatalogSection
                  title="Rare"
                  items={baseItemsRareFiltered}
                  selectedCodes={selectedRareBaseCodes}
                  onToggle={toggleRareBase}
                  onSelectAll={selectAllRareBases}
                  onClearAll={clearAllRareBases}
                  accentClass="text-d2-rare"
                  itemColorClass="text-d2-rare"
                  noContainer
                  fillPanel
                />
              </>
            )}
            {activeTab === "unique" && (
              <CatalogSection
                title="Unique"
                items={uniqueItems}
                selectedCodes={selectedUniqueCodes}
                onToggle={toggleUnique}
                onSelectAll={selectAllUnique}
                onClearAll={clearAllUnique}
                accentClass="text-d2-unique"
                itemColorClass="text-d2-unique"
                noContainer
                fillPanel
                sortBySlotThenLabel
              />
            )}
            {activeTab === "sets" && (
              <CatalogSection
                title="Sets"
                items={setItems}
                selectedCodes={selectedSetCodes}
                onToggle={toggleSet}
                onSelectAll={selectAllSet}
                onClearAll={clearAllSet}
                accentClass="text-d2-set"
                itemColorClass="text-d2-set"
                noContainer
                fillPanel
              />
            )}
            {activeTab === "runes" && (
              <CatalogSection
                title="Runes"
                items={runeItems}
                selectedCodes={selectedRuneCodes}
                onToggle={toggleRune}
                onSelectAll={selectAllRunes}
                onClearAll={clearAllRunes}
                accentClass="text-d2-crafted"
                itemColorClass="text-d2-crafted"
                noContainer
                fillPanel
                sortAlphabetically={false}
              />
            )}
            {activeTab === "gems" && (
              <CatalogSection
                title="Gems"
                items={gemItems}
                selectedCodes={selectedGemCodes}
                onToggle={toggleGem}
                onSelectAll={selectAllGems}
                onClearAll={clearAllGems}
                accentClass="text-zinc-400"
                itemColorClass="text-zinc-400"
                noContainer
                fillPanel
                sortAlphabetically={false}
              />
            )}
            {activeTab === "potions" && (
              <CatalogSection
                title="Potions"
                items={potionItems}
                selectedCodes={selectedPotionCodes}
                onToggle={togglePotion}
                onSelectAll={selectAllPotions}
                onClearAll={clearAllPotions}
                accentClass="text-zinc-400"
                itemColorClass="text-zinc-400"
                noContainer
                fillPanel
                sortAlphabetically={false}
              />
            )}
            {activeTab === "quest" && (
              <CatalogSection
                title="Quest"
                items={questItems}
                selectedCodes={selectedQuestCodes}
                onToggle={toggleQuest}
                onSelectAll={selectAllQuest}
                onClearAll={clearAllQuest}
                accentClass="text-d2-quest"
                itemColorClass="text-d2-quest"
                noContainer
                fillPanel
                sortAlphabetically={false}
              />
            )}
            {activeTab === "misc" && (
              <CatalogSection
                title="Misc"
                items={miscOtherItems}
                selectedCodes={selectedMiscOtherCodes}
                onToggle={toggleMiscOther}
                onSelectAll={selectAllMiscOther}
                onClearAll={clearAllMiscOther}
                accentClass="text-zinc-400"
                itemColorClass="text-zinc-400"
                noContainer
                fillPanel
              />
            )}
            {activeTab === "gold" && (
              <div className="flex flex-col gap-6 p-4 flex-1 min-h-0 overflow-auto">
                <div className="flex flex-col gap-4 max-w-md">
                  <h2 className="text-lg font-medium text-d2-gold">Gold Filter</h2>
                  <p className="text-sm text-zinc-400">
                    Hide small gold piles and show only gold above a threshold. The game uses two rules: hide gold &lt; threshold, show gold &gt; threshold.
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={goldFilterEnabled}
                      onChange={(e) => setGoldFilterEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-d2-gold focus:ring-d2-gold focus:ring-offset-zinc-900"
                    />
                    <span className="text-zinc-300">Enable gold filter</span>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm text-zinc-400">Minimum gold to show (threshold)</span>
                    <input
                      type="number"
                      min={1}
                      max={99999999}
                      step={1000}
                      value={goldFilterThreshold}
                      onChange={(e) => setGoldFilterThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      disabled={!goldFilterEnabled}
                      className="w-32 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-d2-gold focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </label>
                  {goldFilterEnabled && (
                    <p className="text-xs text-zinc-500">
                      Exported rules: &quot;Gold Less Than {goldFilterThreshold}&quot; (hide), &quot;Gold Greater Than {goldFilterThreshold}&quot; (show)
                    </p>
                  )}
                </div>
              </div>
            )}
          </CatalogTabs>
        </div>

        <div className="flex flex-wrap items-center gap-4 flex-shrink-0 pt-2">
          <button
            onClick={handleExportJson}
            disabled={!canExport}
            className="px-5 py-2.5 rounded-lg font-medium bg-d2-unique text-zinc-900 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-d2-unique focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            Export JSON
          </button>
          <button
            onClick={handleCopyToClipboard}
            disabled={!canExport}
            className="px-5 py-2.5 rounded-lg font-medium bg-zinc-700 text-white border border-zinc-600 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            Copy to clipboard
          </button>
          {copyFeedback && (
            <span className="text-sm text-emerald-400">Copied!</span>
          )}
          {canExport && !copyFeedback && (
            <span className="text-sm text-zinc-500">
              Then in game: Import from Clipboard
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
