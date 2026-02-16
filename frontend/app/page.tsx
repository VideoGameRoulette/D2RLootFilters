"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Catalog, SelectableItem } from "@/lib/types";
import { catalogToSelectableItems } from "@/lib/catalog";
import {
  buildFilterFromSelection,
  serializeFilter,
} from "@/lib/buildFilter";
import { parseLoadedFilter } from "@/lib/parseFilter";
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
import type { BasesCatalog, EquipmentQuality, GemsCatalog, PotionsCatalog, QuestCatalog, FilterRule, LootFilter } from "@/lib/types";

const QUALITIES: EquipmentQuality[] = ["normal", "exceptional", "elite"];

const MAX_RULES = 32;

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

/** Group potions into 4 rules (Health, Mana, Rejuvenation, Status) to save rule count. */
const POTION_GROUPS: { name: string; codes: string[] }[] = [
  { name: "Health Potions", codes: ["hp1", "hp2", "hp3", "hp4", "hp5"] },
  { name: "Mana Potions", codes: ["mp1", "mp2", "mp3", "mp4", "mp5"] },
  { name: "Rejuvenation Potions", codes: ["rvl", "rvs"] },
  { name: "Status Potions", codes: ["yps", "vps", "wms"] },
];

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dataBase = typeof process.env.NEXT_PUBLIC_BASE_PATH === "string" ? process.env.NEXT_PUBLIC_BASE_PATH : "";

  useEffect(() => {
    Promise.all([
      fetch(`${dataBase}/data/catalog.sets.json`).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("Sets catalog not found"))
      ),
      fetch(`${dataBase}/data/catalog.uniques.json`).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("Uniques catalog not found"))
      ),
      fetch(`${dataBase}/data/catalog.bases.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${dataBase}/data/catalog.gems.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${dataBase}/data/catalog.potions.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${dataBase}/data/catalog.quest.json`)
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
  }, [dataBase]);

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

  const gemCodeSet = useMemo(
    () => new Set(gemItems.flatMap((i) => i.codes)),
    [gemItems]
  );
  const potionCodeSet = useMemo(
    () => new Set(potionItems.flatMap((i) => i.codes)),
    [potionItems]
  );
  const questCodeSet = useMemo(
    () => new Set(questItems.flatMap((i) => i.codes)),
    [questItems]
  );

  const { other: miscOtherRaw } = useMemo(
    () => categorizeMisc(miscItemsRaw),
    [miscItemsRaw]
  );

  const miscOtherItems = useMemo(
    () =>
      miscOtherRaw.filter(
        (item) => !jewelCodeSet.has(item.code) && item.code !== "gld"
      ),
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

  const miscItemRules = useMemo(() => {
    const out: { name: string; codes: string[] }[] = [];
    for (const group of POTION_GROUPS) {
      const codes = group.codes.filter((c) => selectedPotionCodes.has(c));
      if (codes.length > 0) out.push({ name: group.name, codes });
    }
    for (const item of miscOtherItems) {
      const codes = item.codes.filter((c) => selectedMiscOtherCodes.has(c));
      if (codes.length > 0) out.push({ name: item.label, codes });
    }
    return out;
  }, [
    miscOtherItems,
    selectedPotionCodes,
    selectedMiscOtherCodes,
  ]);

  const ruleCount = useMemo(() => {
    const profile = profileName.replace(/\s/g, "") || "LootFilter";
    const filter = buildFilterFromSelection(
      profile,
      Array.from(selectedSetCodes),
      Array.from(selectedUniqueCodes),
      Array.from(selectedRuneCodes),
      Array.from(selectedNormalBaseCodes),
      Array.from(selectedMagicBaseCodes),
      Array.from(selectedRareBaseCodes),
      Array.from(selectedQuestCodes),
      Array.from(selectedGemCodes),
      miscItemRules,
      Array.from(selectedSocketedEtherealBaseCodes),
      goldFilterEnabled ? { enabled: true, threshold: goldFilterThreshold } : undefined
    );
    return filter.rules.length;
  }, [
    profileName,
    selectedSetCodes,
    selectedUniqueCodes,
    selectedRuneCodes,
    selectedNormalBaseCodes,
    selectedMagicBaseCodes,
    selectedRareBaseCodes,
    selectedQuestCodes,
    selectedGemCodes,
    miscItemRules,
    selectedSocketedEtherealBaseCodes,
    goldFilterEnabled,
    goldFilterThreshold,
  ]);

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
      Array.from(selectedQuestCodes),
      Array.from(selectedGemCodes),
      miscItemRules,
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
    selectedQuestCodes,
    selectedGemCodes,
    miscItemRules,
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

  const handleLoadFilter = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLoadError(null);
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = typeof reader.result === "string" ? reader.result : "";
          const filter = parseLoadedFilter(text);
          const normal: string[] = [];
          const socketedEthereal: string[] = [];
          const magic: string[] = [];
          const rare: string[] = [];
          const unique: string[] = [];
          const set: string[] = [];
          const runes: string[] = [];
          const gems: string[] = [];
          const potions: string[] = [];
          const quest: string[] = [];
          const miscOther: string[] = [];
          let goldEnabled = false;
          let goldThreshold = 5000;

          for (const rule of filter.rules) {
            const eq = rule.equipmentItemCode;
            const ic = rule.itemCode;
            const rar = rule.equipmentRarity;

            if (rar?.includes("normal") && !rule.filterEtherealSocketed && eq) normal.push(...eq);
            else if (rar?.includes("normal") && rule.filterEtherealSocketed && eq) socketedEthereal.push(...eq);
            else if (rar?.includes("magic") && eq) magic.push(...eq);
            else if (rar?.includes("rare") && eq) rare.push(...eq);
            else if (rar?.includes("unique") && eq) unique.push(...eq);
            else if (rar?.includes("set") && eq) set.push(...eq);
            else if (ic?.length) {
              const allRunes = ic.every((c) => runeCodeSet.has(c));
              if (allRunes) runes.push(...ic);
              else {
                for (const c of ic) {
                  if (gemCodeSet.has(c)) gems.push(c);
                  else if (potionCodeSet.has(c)) potions.push(c);
                  else if (questCodeSet.has(c)) quest.push(c);
                  else miscOther.push(c);
                }
              }
            }
            if (rule.goldFilterValue != null && rule.ruleType === "hide") {
              goldEnabled = true;
              goldThreshold = rule.goldFilterValue;
            }
          }

          setProfileName(filter.name);
          setSelectedNormalBaseCodes(new Set(normal));
          setSelectedSocketedEtherealBaseCodes(new Set(socketedEthereal));
          setSelectedMagicBaseCodes(new Set(magic));
          setSelectedRareBaseCodes(new Set(rare));
          setSelectedUniqueCodes(new Set(unique));
          setSelectedSetCodes(new Set(set));
          setSelectedRuneCodes(new Set(runes));
          setSelectedGemCodes(new Set(gems));
          setSelectedPotionCodes(new Set(potions));
          setSelectedQuestCodes(new Set(quest));
          setSelectedMiscOtherCodes(new Set(miscOther));
          setGoldFilterEnabled(goldEnabled);
          setGoldFilterThreshold(goldThreshold);
        } catch (err) {
          setLoadError(err instanceof Error ? err.message : "Failed to load filter");
        }
        e.target.value = "";
      };
      reader.onerror = () => setLoadError("Failed to read file");
      reader.readAsText(file, "utf-8");
    },
    [runeCodeSet, gemCodeSet, potionCodeSet, questCodeSet]
  );

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
  const canExport = (totalSelected > 0 || goldFilterEnabled) && ruleCount <= MAX_RULES;

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
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full">
        <header className="flex-shrink-0 border-b border-zinc-700/60 bg-zinc-900/70">
          <div className="px-4 md:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={`${dataBase}/imgs/logo.png`}
                  alt=""
                  className="h-32 w-auto object-contain"
                />
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  D2R Loot Filter Builder
                </h1>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-zinc-500 font-medium mr-1">
                  Game v3.1.91636 · Updated 2026-02-14
                </span>
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleLoadFilter}
                  className="hidden"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Load filter"
                  className="p-2 rounded-lg bg-zinc-600 text-white border border-zinc-500 hover:bg-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  disabled={!canExport}
                  title="Export JSON"
                  className="p-2 rounded-lg bg-d2-unique text-zinc-900 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-d2-unique focus:ring-offset-2 focus:ring-offset-zinc-900"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  disabled={!canExport}
                  title="Copy to clipboard — Then in game: Import from Clipboard"
                  className="p-2 rounded-lg bg-zinc-700 text-white border border-zinc-600 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                {loadError && (
                  <span className="text-xs text-red-400" role="alert">
                    {loadError}
                  </span>
                )}
                {copyFeedback && (
                  <span className="text-xs text-emerald-400">Copied!</span>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 gap-y-3">
              <label className="flex items-center gap-2">
                <span className="text-zinc-500 text-sm">Profile name</span>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="MyFilter (no spaces)"
                  className="bg-zinc-800/80 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent max-w-[200px]"
                />
              </label>
              <span
                className={`text-sm font-medium tabular-nums ${
                  ruleCount > MAX_RULES
                    ? "text-amber-400"
                    : "text-zinc-400"
                }`}
                title={ruleCount > MAX_RULES ? `Game allows max ${MAX_RULES} rules. Reduce selections to export.` : undefined}
              >
                Rules: {ruleCount} / {MAX_RULES}
              </span>
              <div className="text-xs text-zinc-500 border-l border-zinc-600/80 pl-4 hidden sm:block">
                Selected: Normal {selectedNormalBaseCodes.size} · Socketed / Ethereal {selectedSocketedEtherealBaseCodes.size} · Magic {selectedMagicBaseCodes.size} · Rare {selectedRareBaseCodes.size} · Unique {selectedUniqueCodes.size} · Sets {selectedSetCodes.size} · Runes {selectedRuneCodes.size} · Gems {selectedGemCodes.size} · Potions {selectedPotionCodes.size} · Quest {selectedQuestCodes.size} · Misc {selectedMiscOtherCodes.size}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-shrink-0 px-4 md:px-6 lg:px-8 py-3 bg-zinc-900/30 border-b border-zinc-800/50 sm:hidden">
          <div className="text-xs text-zinc-500">
            Selected: Normal {selectedNormalBaseCodes.size} · Socketed / Ethereal {selectedSocketedEtherealBaseCodes.size} · Magic {selectedMagicBaseCodes.size} · Rare {selectedRareBaseCodes.size} · Unique {selectedUniqueCodes.size} · Sets {selectedSetCodes.size} · Runes {selectedRuneCodes.size} · Gems {selectedGemCodes.size} · Potions {selectedPotionCodes.size} · Quest {selectedQuestCodes.size} · Misc {selectedMiscOtherCodes.size}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 md:px-6 lg:px-8 py-4">
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
                  itemImageBasePath={`${dataBase}/item-images`}
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
                  itemImageBasePath={`${dataBase}/item-images`}
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
                  itemImageBasePath={`${dataBase}/item-images`}
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
                  itemImageBasePath={`${dataBase}/item-images`}
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
                itemImageBasePath={`${dataBase}/item-images`}
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
                itemImageBasePath={`${dataBase}/item-images`}
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
                itemImageBasePath={`${dataBase}/item-images`}
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
                itemImageBasePath={`${dataBase}/item-images`}
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
                itemImageBasePath={`${dataBase}/item-images`}
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
                itemImageBasePath={`${dataBase}/item-images`}
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
                itemImageBasePath={`${dataBase}/item-images`}
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
      </div>
    </main>
  );
}
