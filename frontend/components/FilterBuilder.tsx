"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import type { Catalog, SelectableItem } from "@/lib/types";
import { catalogToSelectableItems } from "@/lib/catalog";
import { buildFilterFromSelection, serializeFilter } from "@/lib/buildFilter";
import { parseLoadedFilter } from "@/lib/parseFilter";
import { RUNES } from "@/lib/runes";
import { basesToSelectableItems } from "@/lib/basesCatalog";
import { gemsToSelectableItems } from "@/lib/gemsCatalog";
import { potionsToSelectableItems } from "@/lib/potionsCatalog";
import { questToSelectableItems } from "@/lib/questCatalog";
import { miscToSelectableItems } from "@/lib/miscCatalog";
import { CatalogSection } from "@/components/CatalogSection";
import { CatalogTabs } from "@/components/CatalogTabs";
import { Toolbar, type SavedFilter } from "@/components/Toolbar";
import {
  QUALITIES,
  ARMOR_WEIGHTS,
  SLOT_FILTER_ORDER,
  MAX_RULES,
  TAB_ORDER,
  POTION_GROUPS,
  ENDGAME_CODES,
} from "@/lib/filterConstants";
import type {
  BasesCatalog,
  EquipmentQuality,
  ArmorWeightClass,
  GemsCatalog,
  PotionsCatalog,
  QuestCatalog,
  MiscCatalog,
  LootFilter,
} from "@/lib/types";

const WEAPON_HANDLING_OPTIONS = ["1H", "2H"] as const;
type WeaponHandling = (typeof WEAPON_HANDLING_OPTIONS)[number];

const TABS = [
  { id: "normal", label: "Normal", shortLabel: "Normal", accentClass: "text-d2-normal" },
  { id: "socketedEthereal", label: "Socketed / Ethereal", shortLabel: "S/E", accentClass: "text-d2-normal" },
  { id: "normalSuperior", label: "Normal Superior", shortLabel: "Norm Sup", accentClass: "text-d2-normal" },
  { id: "socketedEtherealSuperior", label: "Socketed / Ethereal Superior", shortLabel: "S/E Sup", accentClass: "text-d2-normal" },
  { id: "magic", label: "Magic", shortLabel: "Magic", accentClass: "text-d2-magic" },
  { id: "rare", label: "Rare", shortLabel: "Rare", accentClass: "text-d2-rare" },
  { id: "unique", label: "Unique", shortLabel: "Unique", accentClass: "text-d2-unique" },
  { id: "sets", label: "Sets", shortLabel: "Sets", accentClass: "text-d2-set" },
  { id: "runes", label: "Runes", shortLabel: "Runes", accentClass: "text-d2-crafted" },
  { id: "gems", label: "Gems", shortLabel: "Gems", accentClass: "text-zinc-400" },
  { id: "potions", label: "Potions", shortLabel: "Potions", accentClass: "text-zinc-400" },
  { id: "quest", label: "Quest", shortLabel: "Quest", accentClass: "text-d2-quest" },
  { id: "endgame", label: "Endgame", shortLabel: "Endgame", accentClass: "text-d2-crafted" },
  { id: "misc", label: "Misc", shortLabel: "Misc", accentClass: "text-zinc-400" },
  { id: "gold", label: "Gold", shortLabel: "Gold", accentClass: "text-d2-gold" },
] as const;

interface FilterBuilderProps {
  mobile?: boolean;
}

export function FilterBuilder({ mobile = false }: FilterBuilderProps) {
  const [setsCatalog, setSetsCatalog] = useState<Catalog | null>(null);
  const [uniquesCatalog, setUniquesCatalog] = useState<Catalog | null>(null);
  const [profileName, setProfileName] = useState("MyFilter");
  const [selectedSetCodes, setSelectedSetCodes] = useState<Set<string>>(new Set());
  const [selectedUniqueCodes, setSelectedUniqueCodes] = useState<Set<string>>(new Set());
  const [selectedRuneCodes, setSelectedRuneCodes] = useState<Set<string>>(new Set());
  const [basesCatalog, setBasesCatalog] = useState<BasesCatalog | null>(null);
  const [gemsCatalog, setGemsCatalog] = useState<GemsCatalog | null>(null);
  const [potionsCatalog, setPotionsCatalog] = useState<PotionsCatalog | null>(null);
  const [questCatalog, setQuestCatalog] = useState<QuestCatalog | null>(null);
  const [miscCatalog, setMiscCatalog] = useState<MiscCatalog | null>(null);
  const [selectedNormalBaseCodes, setSelectedNormalBaseCodes] = useState<Set<string>>(new Set());
  const [selectedSocketedEtherealBaseCodes, setSelectedSocketedEtherealBaseCodes] = useState<Set<string>>(new Set());
  const [selectedNormalSuperiorBaseCodes, setSelectedNormalSuperiorBaseCodes] = useState<Set<string>>(new Set());
  const [selectedSocketedEtherealSuperiorBaseCodes, setSelectedSocketedEtherealSuperiorBaseCodes] = useState<Set<string>>(new Set());
  const [selectedMagicBaseCodes, setSelectedMagicBaseCodes] = useState<Set<string>>(new Set());
  const [selectedRareBaseCodes, setSelectedRareBaseCodes] = useState<Set<string>>(new Set());
  const [selectedGemCodes, setSelectedGemCodes] = useState<Set<string>>(new Set());
  const [selectedPotionCodes, setSelectedPotionCodes] = useState<Set<string>>(new Set());
  const [selectedQuestCodes, setSelectedQuestCodes] = useState<Set<string>>(new Set());
  const [selectedEndgameCodes, setSelectedEndgameCodes] = useState<Set<string>>(new Set());
  const [selectedMiscOtherCodes, setSelectedMiscOtherCodes] = useState<Set<string>>(new Set());
  const [goldFilterEnabled, setGoldFilterEnabled] = useState(false);
  const [goldFilterThreshold, setGoldFilterThreshold] = useState(5000);
  const [showFilterDrawer, setShowFilterDrawer] = useState(!mobile);
  const [tierFilter, setTierFilter] = useState<Set<EquipmentQuality>>(() => new Set());
  const [weightFilter, setWeightFilter] = useState<Set<ArmorWeightClass>>(() => new Set());
  const [socketFilterEnabled, setSocketFilterEnabled] = useState(false);
  const [socketFilterValue, setSocketFilterValue] = useState(4);
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [weaponHandlingFilter, setWeaponHandlingFilter] = useState<Set<WeaponHandling>>(() => new Set());
  const [activeTab, setActiveTab] = useState<string>(TAB_ORDER[0]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showPastePanel, setShowPastePanel] = useState(false);
  const [pasteInput, setPasteInput] = useState("");
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dataBase = typeof process.env.NEXT_PUBLIC_BASE_PATH === "string" ? process.env.NEXT_PUBLIC_BASE_PATH : "";
  const { csrfToken, user } = useAuth();
  const router = useRouter();
  const [presets, setPresets] = useState<SavedFilter[]>([]);
  const [userFilters, setUserFilters] = useState<SavedFilter[]>([]);
  const [filtersRefresh, setFiltersRefresh] = useState(0);
  const [mobileDropdown, setMobileDropdown] = useState<"actions" | "presets" | "filters" | "help" | "auth" | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${dataBase}/data/catalog.sets.json`).then((r) => r.ok ? r.json() : Promise.reject(new Error("Sets catalog not found"))),
      fetch(`${dataBase}/data/catalog.uniques.json`).then((r) => r.ok ? r.json() : Promise.reject(new Error("Uniques catalog not found"))),
      fetch(`${dataBase}/data/catalog.bases.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${dataBase}/data/catalog.gems.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${dataBase}/data/catalog.potions.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${dataBase}/data/catalog.quest.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${dataBase}/data/catalog.misc.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([sets, uniques, bases, gems, potions, quest, misc]) => {
        setSetsCatalog(sets);
        setUniquesCatalog(uniques);
        setBasesCatalog(bases ?? null);
        setGemsCatalog(gems ?? null);
        setPotionsCatalog(potions ?? null);
        setQuestCatalog(quest ?? null);
        setMiscCatalog(misc ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [dataBase]);

  useEffect(() => {
    const norm = (d: unknown): SavedFilter[] => {
      const list = Array.isArray(d) ? d : (d && typeof d === "object" && "results" in d && Array.isArray((d as { results: unknown }).results) ? (d as { results: unknown[] }).results : []);
      return list.map((f: { id: string; name: string; payload?: unknown }) => ({ id: String(f.id), name: f.name, payload: (f.payload && typeof f.payload === "object" && "rules" in (f.payload as object)) ? (f.payload as { name: string; rules: unknown[] }) : { name: f.name, rules: [] } }));
    };
    fetch("/api/v2/loot-filters/presets/", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((data) => setPresets(norm(data)))
      .catch(() => setPresets([]));
  }, []);

  useEffect(() => {
    if (!user) {
      setUserFilters([]);
      return;
    }
    const norm = (d: unknown): SavedFilter[] => {
      const list = Array.isArray(d) ? d : (d && typeof d === "object" && "results" in d && Array.isArray((d as { results: unknown }).results) ? (d as { results: unknown[] }).results : []);
      return list.map((f: { id: string; name: string; payload?: unknown }) => ({ id: String(f.id), name: f.name, payload: (f.payload && typeof f.payload === "object" && "rules" in (f.payload as object)) ? (f.payload as { name: string; rules: unknown[] }) : { name: f.name, rules: [] } }));
    };
    fetch("/api/v2/loot-filters/mine/", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((data) => setUserFilters(norm(data)))
      .catch(() => setUserFilters([]));
  }, [user, filtersRefresh]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const baseStatsByCode = useMemo(() => {
    const map = new Map<string, Partial<SelectableItem>>();
    if (!basesCatalog) return map;
    for (const entry of basesCatalog.entries) {
      if ("kind" in entry && entry.kind === "header") continue;
      if (!("code" in entry) || !entry.code) continue;
      map.set(entry.code, {
        quality: entry.quality,
        minDefense: entry.minDefense,
        maxDefense: entry.maxDefense,
        oneHandDamage: entry.oneHandDamage,
        twoHandDamage: entry.twoHandDamage,
        armorWeightClass: entry.armorWeightClass,
        maxSockets: entry.maxSockets,
        requiredStrength: entry.requiredStrength,
        requiredDexterity: entry.requiredDexterity,
        requiredLevel: entry.requiredLevel,
      });
    }
    return map;
  }, [basesCatalog]);

  const setItems = useMemo<SelectableItem[]>(() => {
    const baseItems = setsCatalog ? catalogToSelectableItems(setsCatalog, "set") : [];
    return baseItems.map((item) => ({ ...item, ...(baseStatsByCode.get(item.code) ?? {}) }));
  }, [setsCatalog, baseStatsByCode]);

  const uniqueItems = useMemo<SelectableItem[]>(() => {
    const baseItems = uniquesCatalog ? catalogToSelectableItems(uniquesCatalog, "unique") : [];
    return baseItems.map((item) => {
      const baseCode = item.codes[0];
      return { ...item, ...(baseCode ? baseStatsByCode.get(baseCode) ?? {} : {}) };
    });
  }, [uniquesCatalog, baseStatsByCode]);

  const runeItems = useMemo<SelectableItem[]>(() => RUNES.map((r) => ({ code: r.code, codes: [r.code], label: r.name, rarity: "unique" as const })), []);
  const runeCodeSet = useMemo(() => new Set(RUNES.map((r) => r.code)), []);
  const jewelCodeSet = useMemo(() => new Set(["jew", "cjw"]), []);

  const baseItems = useMemo<SelectableItem[]>(() =>
    basesCatalog ? basesToSelectableItems(basesCatalog, { excludeSlotOther: true, excludeCodes: ["vip"], includeCodesFromOther: ["cm1", "cm2", "cm3", "jew"] }) : [],
  [basesCatalog]);

  const baseItemsRare = useMemo<SelectableItem[]>(() =>
    basesCatalog ? basesToSelectableItems(basesCatalog, { excludeSlotOther: true, excludeCodes: ["vip", "cm1", "cm2", "cm3"], includeCodesFromOther: ["jew"] }) : [],
  [basesCatalog]);

  const baseItemsNormal = useMemo<SelectableItem[]>(() =>
    basesCatalog ? basesToSelectableItems(basesCatalog, { excludeSlotOther: true, excludeSlots: ["Ring", "Amulet"] }) : [],
  [basesCatalog]);

  const toggleTierFilter = useCallback((q: EquipmentQuality) => {
    setTierFilter((prev) => { const next = new Set(prev); if (next.has(q)) next.delete(q); else next.add(q); return next; });
  }, []);
  const toggleWeightFilter = useCallback((w: ArmorWeightClass) => {
    setWeightFilter((prev) => { const next = new Set(prev); if (next.has(w)) next.delete(w); else next.add(w); return next; });
  }, []);
  const toggleCategoryFilter = useCallback((slot: string) => {
    setCategoryFilter((prev) => { const next = new Set(prev); if (next.has(slot)) next.delete(slot); else next.add(slot); return next; });
  }, []);
  const toggleWeaponHandlingFilter = useCallback((value: WeaponHandling) => {
    setWeaponHandlingFilter((prev) => { const next = new Set(prev); if (next.has(value)) next.delete(value); else next.add(value); return next; });
  }, []);

  const gemItems = useMemo(() => gemsToSelectableItems(gemsCatalog), [gemsCatalog]);
  const potionItems = useMemo(() => potionsToSelectableItems(potionsCatalog), [potionsCatalog]);
  const endgameCodeSet = useMemo(() => new Set<string>(ENDGAME_CODES), []);
  const fullQuestItems = useMemo(() => questToSelectableItems(questCatalog), [questCatalog]);
  const questItems = useMemo(() => fullQuestItems.filter((i) => !endgameCodeSet.has(i.code)), [fullQuestItems, endgameCodeSet]);
  const endgameItems = useMemo(() => fullQuestItems.filter((i) => endgameCodeSet.has(i.code)), [fullQuestItems, endgameCodeSet]);
  const gemCodeSet = useMemo(() => new Set(gemItems.flatMap((i) => i.codes)), [gemItems]);
  const potionCodeSet = useMemo(() => new Set(potionItems.flatMap((i) => i.codes)), [potionItems]);
  const questCodeSet = useMemo(() => new Set(questItems.flatMap((i) => i.codes)), [questItems]);
  const miscItems = useMemo(() => miscToSelectableItems(miscCatalog), [miscCatalog]);
  const miscOtherItems = useMemo(() => miscItems.filter((item) => !jewelCodeSet.has(item.code) && item.code !== "gld"), [miscItems, jewelCodeSet]);

  const categoryOptions = useMemo(() => {
    const allItems = [...baseItemsNormal, ...baseItems, ...baseItemsRare, ...uniqueItems, ...setItems, ...runeItems, ...gemItems, ...potionItems, ...questItems, ...endgameItems, ...miscOtherItems];
    const categorySet = new Set<string>();
    for (const item of allItems) { if (item.slot) categorySet.add(item.slot); }
    return [...categorySet].sort((a, b) => {
      const ai = SLOT_FILTER_ORDER.indexOf(a); const bi = SLOT_FILTER_ORDER.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi; if (ai >= 0) return -1; if (bi >= 0) return 1;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  }, [baseItemsNormal, baseItems, baseItemsRare, uniqueItems, setItems, runeItems, gemItems, potionItems, questItems, endgameItems, miscOtherItems]);

  const applyGlobalFilters = useCallback((items: SelectableItem[]) => {
    return items.filter((item) => {
      if (tierFilter.size > 0 && (!item.quality || !tierFilter.has(item.quality))) return false;
      if (weightFilter.size > 0 && (!item.armorWeightClass || !weightFilter.has(item.armorWeightClass))) return false;
      if (categoryFilter.size > 0 && (!item.slot || !categoryFilter.has(item.slot))) return false;
      if (weaponHandlingFilter.size > 0) {
        const hasOneHand = Boolean(item.oneHandDamage); const hasTwoHand = Boolean(item.twoHandDamage);
        const matchesOneHand = weaponHandlingFilter.has("1H") && hasOneHand;
        const matchesTwoHand = weaponHandlingFilter.has("2H") && hasTwoHand;
        if (!matchesOneHand && !matchesTwoHand) return false;
      }
      if (socketFilterEnabled && (typeof item.maxSockets !== "number" || !Number.isFinite(item.maxSockets) || item.maxSockets < socketFilterValue)) return false;
      return true;
    });
  }, [tierFilter, weightFilter, categoryFilter, weaponHandlingFilter, socketFilterEnabled, socketFilterValue]);

  const baseItemsNormalFiltered = useMemo(() => applyGlobalFilters(baseItemsNormal), [applyGlobalFilters, baseItemsNormal]);
  const baseItemsFiltered = useMemo(() => applyGlobalFilters(baseItems), [applyGlobalFilters, baseItems]);
  const baseItemsRareFiltered = useMemo(() => applyGlobalFilters(baseItemsRare), [applyGlobalFilters, baseItemsRare]);
  const uniqueItemsFiltered = useMemo(() => applyGlobalFilters(uniqueItems), [applyGlobalFilters, uniqueItems]);
  const setItemsFiltered = useMemo(() => applyGlobalFilters(setItems), [applyGlobalFilters, setItems]);
  const runeItemsFiltered = useMemo(() => applyGlobalFilters(runeItems), [applyGlobalFilters, runeItems]);
  const gemItemsFiltered = useMemo(() => applyGlobalFilters(gemItems), [applyGlobalFilters, gemItems]);
  const potionItemsFiltered = useMemo(() => applyGlobalFilters(potionItems), [applyGlobalFilters, potionItems]);
  const questItemsFiltered = useMemo(() => applyGlobalFilters(questItems), [applyGlobalFilters, questItems]);
  const endgameItemsFiltered = useMemo(() => applyGlobalFilters(endgameItems), [applyGlobalFilters, endgameItems]);
  const miscOtherItemsFiltered = useMemo(() => applyGlobalFilters(miscOtherItems), [applyGlobalFilters, miscOtherItems]);

  const toggleSet = useCallback((codes: string[]) => { setSelectedSetCodes((prev) => { const next = new Set(prev); const allSelected = codes.every((c) => next.has(c)); if (allSelected) codes.forEach((c) => next.delete(c)); else codes.forEach((c) => next.add(c)); return next; }); }, []);
  const toggleUnique = useCallback((codes: string[]) => { setSelectedUniqueCodes((prev) => { const next = new Set(prev); const allSelected = codes.every((c) => next.has(c)); if (allSelected) codes.forEach((c) => next.delete(c)); else codes.forEach((c) => next.add(c)); return next; }); }, []);
  const selectAllSet = useCallback(() => setSelectedSetCodes(new Set(setItemsFiltered.flatMap((i) => i.codes))), [setItemsFiltered]);
  const clearAllSet = useCallback(() => setSelectedSetCodes(new Set()), []);
  const selectAllUnique = useCallback(() => setSelectedUniqueCodes(new Set(uniqueItemsFiltered.flatMap((i) => i.codes))), [uniqueItemsFiltered]);
  const clearAllUnique = useCallback(() => setSelectedUniqueCodes(new Set()), []);
  const toggleRune = useCallback((codes: string[]) => { setSelectedRuneCodes((prev) => { const next = new Set(prev); const allSelected = codes.every((c) => next.has(c)); if (allSelected) codes.forEach((c) => next.delete(c)); else codes.forEach((c) => next.add(c)); return next; }); }, []);
  const selectAllRunes = useCallback(() => setSelectedRuneCodes(new Set(runeItemsFiltered.flatMap((i) => i.codes))), [runeItemsFiltered]);
  const clearAllRunes = useCallback(() => setSelectedRuneCodes(new Set()), []);

  const toggleNormalBase = useCallback((codes: string[]) => { setSelectedNormalBaseCodes((prev) => { const next = new Set(prev); const allSelected = codes.every((c) => next.has(c)); if (allSelected) codes.forEach((c) => next.delete(c)); else codes.forEach((c) => next.add(c)); return next; }); }, []);
  const toggleSocketedEtherealBase = useCallback((codes: string[]) => { setSelectedSocketedEtherealBaseCodes((prev) => { const next = new Set(prev); const allSelected = codes.every((c) => next.has(c)); if (allSelected) codes.forEach((c) => next.delete(c)); else codes.forEach((c) => next.add(c)); return next; }); }, []);
  const toggleNormalSuperiorBase = useCallback((codes: string[]) => { setSelectedNormalSuperiorBaseCodes((prev) => { const next = new Set(prev); const allSelected = codes.every((c) => next.has(c)); if (allSelected) codes.forEach((c) => next.delete(c)); else codes.forEach((c) => next.add(c)); return next; }); }, []);
  const toggleSocketedEtherealSuperiorBase = useCallback((codes: string[]) => { setSelectedSocketedEtherealSuperiorBaseCodes((prev) => { const next = new Set(prev); const allSelected = codes.every((c) => next.has(c)); if (allSelected) codes.forEach((c) => next.delete(c)); else codes.forEach((c) => next.add(c)); return next; }); }, []);
  const toggleMagicBase = useCallback((codes: string[]) => { setSelectedMagicBaseCodes((prev) => { const next = new Set(prev); const allSelected = codes.every((c) => next.has(c)); if (allSelected) codes.forEach((c) => next.delete(c)); else codes.forEach((c) => next.add(c)); return next; }); }, []);
  const toggleRareBase = useCallback((codes: string[]) => { setSelectedRareBaseCodes((prev) => { const next = new Set(prev); const allSelected = codes.every((c) => next.has(c)); if (allSelected) codes.forEach((c) => next.delete(c)); else codes.forEach((c) => next.add(c)); return next; }); }, []);

  const selectAllNormalBases = useCallback(() => setSelectedNormalBaseCodes(new Set(baseItemsNormalFiltered.flatMap((i) => i.codes))), [baseItemsNormalFiltered]);
  const selectAllSocketedEtherealBases = useCallback(() => setSelectedSocketedEtherealBaseCodes(new Set(baseItemsNormalFiltered.flatMap((i) => i.codes))), [baseItemsNormalFiltered]);
  const selectAllNormalSuperiorBases = useCallback(() => setSelectedNormalSuperiorBaseCodes(new Set(baseItemsNormalFiltered.flatMap((i) => i.codes))), [baseItemsNormalFiltered]);
  const selectAllSocketedEtherealSuperiorBases = useCallback(() => setSelectedSocketedEtherealSuperiorBaseCodes(new Set(baseItemsNormalFiltered.flatMap((i) => i.codes))), [baseItemsNormalFiltered]);
  const selectAllMagicBases = useCallback(() => setSelectedMagicBaseCodes(new Set(baseItemsFiltered.flatMap((i) => i.codes))), [baseItemsFiltered]);
  const selectAllRareBases = useCallback(() => setSelectedRareBaseCodes(new Set(baseItemsRareFiltered.flatMap((i) => i.codes))), [baseItemsRareFiltered]);
  const clearAllNormalBases = useCallback(() => setSelectedNormalBaseCodes(new Set()), []);
  const clearAllSocketedEtherealBases = useCallback(() => setSelectedSocketedEtherealBaseCodes(new Set()), []);
  const clearAllNormalSuperiorBases = useCallback(() => setSelectedNormalSuperiorBaseCodes(new Set()), []);
  const clearAllSocketedEtherealSuperiorBases = useCallback(() => setSelectedSocketedEtherealSuperiorBaseCodes(new Set()), []);
  const clearAllMagicBases = useCallback(() => setSelectedMagicBaseCodes(new Set()), []);
  const clearAllRareBases = useCallback(() => setSelectedRareBaseCodes(new Set()), []);

  const validCodesForItems = useCallback((codes: string[], itemList: { codes: string[] }[]) => {
    const codeSet = new Set(itemList.flatMap((i) => i.codes));
    return codes.filter((c) => codeSet.has(c));
  }, []);

  const pasteNormalBases = useCallback((codes: string[]) => { const valid = validCodesForItems(codes, baseItemsNormalFiltered); if (valid.length > 0) setSelectedNormalBaseCodes((prev) => new Set([...prev, ...valid])); }, [baseItemsNormalFiltered, validCodesForItems]);
  const pasteSocketedEtherealBases = useCallback((codes: string[]) => { const valid = validCodesForItems(codes, baseItemsNormalFiltered); if (valid.length > 0) setSelectedSocketedEtherealBaseCodes((prev) => new Set([...prev, ...valid])); }, [baseItemsNormalFiltered, validCodesForItems]);
  const pasteNormalSuperiorBases = useCallback((codes: string[]) => { const valid = validCodesForItems(codes, baseItemsNormalFiltered); if (valid.length > 0) setSelectedNormalSuperiorBaseCodes((prev) => new Set([...prev, ...valid])); }, [baseItemsNormalFiltered, validCodesForItems]);
  const pasteSocketedEtherealSuperiorBases = useCallback((codes: string[]) => { const valid = validCodesForItems(codes, baseItemsNormalFiltered); if (valid.length > 0) setSelectedSocketedEtherealSuperiorBaseCodes((prev) => new Set([...prev, ...valid])); }, [baseItemsNormalFiltered, validCodesForItems]);
  const pasteMagicBases = useCallback((codes: string[]) => { const valid = validCodesForItems(codes, baseItemsFiltered); if (valid.length > 0) setSelectedMagicBaseCodes((prev) => new Set([...prev, ...valid])); }, [baseItemsFiltered, validCodesForItems]);
  const pasteRareBases = useCallback((codes: string[]) => { const valid = validCodesForItems(codes, baseItemsRareFiltered); if (valid.length > 0) setSelectedRareBaseCodes((prev) => new Set([...prev, ...valid])); }, [baseItemsRareFiltered, validCodesForItems]);

  const toggleGem = useCallback((codes: string[]) => { setSelectedGemCodes((prev) => { const next = new Set(prev); const allSelected = codes.every((c) => next.has(c)); if (allSelected) codes.forEach((c) => next.delete(c)); else codes.forEach((c) => next.add(c)); return next; }); }, []);
  const selectAllGems = useCallback(() => setSelectedGemCodes(new Set(gemItemsFiltered.flatMap((i) => i.codes))), [gemItemsFiltered]);
  const clearAllGems = useCallback(() => setSelectedGemCodes(new Set()), []);
  const togglePotion = useCallback((codes: string[]) => { setSelectedPotionCodes((prev) => { const next = new Set(prev); const allSelected = codes.every((c) => next.has(c)); if (allSelected) codes.forEach((c) => next.delete(c)); else codes.forEach((c) => next.add(c)); return next; }); }, []);
  const selectAllPotions = useCallback(() => setSelectedPotionCodes(new Set(potionItemsFiltered.flatMap((i) => i.codes))), [potionItemsFiltered]);
  const clearAllPotions = useCallback(() => setSelectedPotionCodes(new Set()), []);
  const toggleQuest = useCallback((codes: string[]) => { setSelectedQuestCodes((prev) => { const next = new Set(prev); const allSelected = codes.every((c) => next.has(c)); if (allSelected) codes.forEach((c) => next.delete(c)); else codes.forEach((c) => next.add(c)); return next; }); }, []);
  const selectAllQuest = useCallback(() => setSelectedQuestCodes(new Set(questItemsFiltered.flatMap((i) => i.codes))), [questItemsFiltered]);
  const clearAllQuest = useCallback(() => setSelectedQuestCodes(new Set()), []);
  const toggleEndgame = useCallback((codes: string[]) => { setSelectedEndgameCodes((prev) => { const next = new Set(prev); const allSelected = codes.every((c) => next.has(c)); if (allSelected) codes.forEach((c) => next.delete(c)); else codes.forEach((c) => next.add(c)); return next; }); }, []);
  const selectAllEndgame = useCallback(() => setSelectedEndgameCodes(new Set(endgameItemsFiltered.flatMap((i) => i.codes))), [endgameItemsFiltered]);
  const clearAllEndgame = useCallback(() => setSelectedEndgameCodes(new Set()), []);
  const toggleMiscOther = useCallback((codes: string[]) => { setSelectedMiscOtherCodes((prev) => { const next = new Set(prev); const allSelected = codes.every((c) => next.has(c)); if (allSelected) codes.forEach((c) => next.delete(c)); else codes.forEach((c) => next.add(c)); return next; }); }, []);
  const selectAllMiscOther = useCallback(() => setSelectedMiscOtherCodes(new Set(miscOtherItemsFiltered.flatMap((i) => i.codes))), [miscOtherItemsFiltered]);
  const clearAllMiscOther = useCallback(() => setSelectedMiscOtherCodes(new Set()), []);

  const miscItemRules = useMemo(() => {
    const out: { name: string; codes: string[] }[] = [];
    for (const group of POTION_GROUPS) { const codes = group.codes.filter((c) => selectedPotionCodes.has(c)); if (codes.length > 0) out.push({ name: group.name, codes }); }
    for (const item of miscOtherItems) { const codes = item.codes.filter((c) => selectedMiscOtherCodes.has(c)); if (codes.length > 0) out.push({ name: item.label, codes }); }
    return out;
  }, [miscOtherItems, selectedPotionCodes, selectedMiscOtherCodes]);

  const ruleCount = useMemo(() => {
    const profile = profileName.replace(/\s/g, "") || "LootFilter";
    const filter = buildFilterFromSelection(profile, Array.from(selectedSetCodes), Array.from(selectedUniqueCodes), Array.from(selectedRuneCodes), Array.from(selectedNormalBaseCodes), Array.from(selectedMagicBaseCodes), Array.from(selectedRareBaseCodes), Array.from(selectedQuestCodes), Array.from(selectedGemCodes), miscItemRules, Array.from(selectedSocketedEtherealBaseCodes), Array.from(selectedNormalSuperiorBaseCodes), Array.from(selectedSocketedEtherealSuperiorBaseCodes), Array.from(selectedEndgameCodes), goldFilterEnabled ? { enabled: true, threshold: goldFilterThreshold } : undefined);
    return filter.rules.length;
  }, [profileName, selectedSetCodes, selectedUniqueCodes, selectedRuneCodes, selectedNormalBaseCodes, selectedMagicBaseCodes, selectedRareBaseCodes, selectedQuestCodes, selectedGemCodes, miscItemRules, selectedSocketedEtherealBaseCodes, selectedNormalSuperiorBaseCodes, selectedSocketedEtherealSuperiorBaseCodes, selectedEndgameCodes, goldFilterEnabled, goldFilterThreshold]);

  const getExportJson = useCallback(() => {
    const profile = profileName.replace(/\s/g, "") || "LootFilter";
    const filter = buildFilterFromSelection(profile, Array.from(selectedSetCodes), Array.from(selectedUniqueCodes), Array.from(selectedRuneCodes), Array.from(selectedNormalBaseCodes), Array.from(selectedMagicBaseCodes), Array.from(selectedRareBaseCodes), Array.from(selectedQuestCodes), Array.from(selectedGemCodes), miscItemRules, Array.from(selectedSocketedEtherealBaseCodes), Array.from(selectedNormalSuperiorBaseCodes), Array.from(selectedSocketedEtherealSuperiorBaseCodes), Array.from(selectedEndgameCodes), goldFilterEnabled ? { enabled: true, threshold: goldFilterThreshold } : undefined);
    return serializeFilter(filter, false);
  }, [profileName, selectedSetCodes, selectedUniqueCodes, selectedRuneCodes, selectedNormalBaseCodes, selectedMagicBaseCodes, selectedRareBaseCodes, selectedQuestCodes, selectedGemCodes, miscItemRules, selectedSocketedEtherealBaseCodes, selectedNormalSuperiorBaseCodes, selectedSocketedEtherealSuperiorBaseCodes, selectedEndgameCodes, goldFilterEnabled, goldFilterThreshold]);

  const handleExportJson = useCallback(() => { const profile = profileName.replace(/\s/g, "") || "LootFilter"; const json = getExportJson(); const blob = new Blob([json], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `lootfilter-${profile}.json`; a.click(); URL.revokeObjectURL(url); }, [profileName, getExportJson]);

  const handleCopyToClipboard = useCallback(async () => { const json = getExportJson(); try { await navigator.clipboard.writeText(json); setCopyFeedback(true); setTimeout(() => setCopyFeedback(false), 2000); } catch { setCopyFeedback(false); } }, [getExportJson]);

  const applyFilterToState = useCallback((filter: LootFilter) => {
    const GAME_CATEGORY_BASE_CODES: Record<string, string[]> = { rings: ["rin"], amule: ["amu"], charm: ["cm1", "cm2", "cm3"], jewel: ["jew", "cjw"] };
    const ITEM_CATEGORY_ENDGAME_CODES: Record<string, string[]> = { absol: ["tes", "ceh", "bet", "fed", "toa"], terrt: ["xa1", "xa2", "xa3", "xa4", "xa5"], uberm: ["pk1", "pk2", "pk3", "mbr", "dhn", "bey", "std", "ua1", "ua2", "ua3", "ua4", "ua5"] };
    const normal: string[] = []; const socketedEthereal: string[] = []; const normalSuperior: string[] = []; const socketedEtherealSuperior: string[] = []; const magic: string[] = []; const rare: string[] = []; const unique: string[] = []; const set: string[] = []; const runes: string[] = []; const gems: string[] = []; const potions: string[] = []; const quest: string[] = []; const endgame: string[] = []; const miscOther: string[] = []; let goldEnabled = false; let goldThreshold = 5000;
    for (const rule of filter.rules) {
      const eq = rule.equipmentItemCode; const ic = rule.itemCode; const rar = rule.equipmentRarity; const itemCat = rule.itemCategory; const eqCat = rule.equipmentCategory;
      if (itemCat?.includes("runes")) runes.push(...runeCodeSet); if (itemCat?.includes("gems")) gems.push(...gemCodeSet);
      if (itemCat?.includes("absol")) endgame.push(...ITEM_CATEGORY_ENDGAME_CODES.absol); if (itemCat?.includes("terrt")) endgame.push(...ITEM_CATEGORY_ENDGAME_CODES.terrt); if (itemCat?.includes("uberm")) endgame.push(...ITEM_CATEGORY_ENDGAME_CODES.uberm);
      if (rar?.length && eqCat?.length && !eq?.length) { for (const cat of eqCat) { const codes = GAME_CATEGORY_BASE_CODES[cat]; if (!codes) continue; if (rar.includes("normal") && !rule.filterEtherealSocketed) normal.push(...codes); if (rar.includes("normal") && rule.filterEtherealSocketed) socketedEthereal.push(...codes); if (rar.includes("hiQuality") && !rule.filterEtherealSocketed) normalSuperior.push(...codes); if (rar.includes("hiQuality") && rule.filterEtherealSocketed) socketedEtherealSuperior.push(...codes); if (rar.includes("magic")) magic.push(...codes); if (rar.includes("rare")) rare.push(...codes); if (rar.includes("unique")) unique.push(...codes); if (rar.includes("set")) set.push(...codes); } }
      if (rar?.includes("normal") && !rule.filterEtherealSocketed && eq) normal.push(...eq); else if (rule.filterEtherealSocketed && eq && (!rar?.length || rar.includes("normal"))) socketedEthereal.push(...eq); else if (rar?.includes("hiQuality") && !rule.filterEtherealSocketed && eq) normalSuperior.push(...eq); else if (rar?.includes("hiQuality") && rule.filterEtherealSocketed && eq) socketedEtherealSuperior.push(...eq); else if (rar?.includes("magic") && eq) magic.push(...eq); else if (rar?.includes("rare") && eq) rare.push(...eq); else if (rar?.includes("unique") && eq) unique.push(...eq); else if (rar?.includes("set") && eq) set.push(...eq); else if (ic?.length) { const allRunes = ic.every((c) => runeCodeSet.has(c)); if (allRunes) runes.push(...ic); else { for (const c of ic) { if (gemCodeSet.has(c)) gems.push(c); else if (potionCodeSet.has(c)) potions.push(c); else if (endgameCodeSet.has(c)) endgame.push(c); else if (questCodeSet.has(c)) quest.push(c); else miscOther.push(c); } } }
      if (rule.goldFilterValue != null && rule.ruleType === "hide") { goldEnabled = true; goldThreshold = rule.goldFilterValue; }
    }
    setProfileName(filter.name); setSelectedNormalBaseCodes(new Set(normal)); setSelectedSocketedEtherealBaseCodes(new Set(socketedEthereal)); setSelectedNormalSuperiorBaseCodes(new Set(normalSuperior)); setSelectedSocketedEtherealSuperiorBaseCodes(new Set(socketedEtherealSuperior)); setSelectedMagicBaseCodes(new Set(magic)); setSelectedRareBaseCodes(new Set(rare)); setSelectedUniqueCodes(new Set(unique)); setSelectedSetCodes(new Set(set)); setSelectedRuneCodes(new Set(runes)); setSelectedGemCodes(new Set(gems)); setSelectedPotionCodes(new Set(potions)); setSelectedQuestCodes(new Set(quest)); setSelectedEndgameCodes(new Set(endgame)); setSelectedMiscOtherCodes(new Set(miscOther)); setGoldFilterEnabled(goldEnabled); setGoldFilterThreshold(goldThreshold);
  }, [runeCodeSet, gemCodeSet, potionCodeSet, questCodeSet, endgameCodeSet]);

  const handleLoadFilter = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { setLoadError(null); const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const text = typeof reader.result === "string" ? reader.result : ""; const filter = parseLoadedFilter(text); applyFilterToState(filter); } catch (err) { setLoadError(err instanceof Error ? err.message : "Failed to load filter"); } e.target.value = ""; }; reader.onerror = () => setLoadError("Failed to read file"); reader.readAsText(file, "utf-8"); }, [applyFilterToState]);

  const handleLoadFromPaste = useCallback(() => { setLoadError(null); const text = pasteInput.trim(); if (!text) { setLoadError("Paste filter JSON first"); return; } try { const filter = parseLoadedFilter(text); applyFilterToState(filter); setPasteInput(""); setShowPastePanel(false); } catch (err) { setLoadError(err instanceof Error ? err.message : "Invalid filter JSON"); } }, [pasteInput, applyFilterToState]);

  const handleLoadFilterPayload = useCallback((payload: { name: string; rules: unknown[] }) => {
    applyFilterToState(payload as LootFilter);
  }, [applyFilterToState]);

  const getFilterPayload = useCallback(() => {
    const profile = profileName.replace(/\s/g, "") || "LootFilter";
    return buildFilterFromSelection(profile, Array.from(selectedSetCodes), Array.from(selectedUniqueCodes), Array.from(selectedRuneCodes), Array.from(selectedNormalBaseCodes), Array.from(selectedMagicBaseCodes), Array.from(selectedRareBaseCodes), Array.from(selectedQuestCodes), Array.from(selectedGemCodes), miscItemRules, Array.from(selectedSocketedEtherealBaseCodes), Array.from(selectedNormalSuperiorBaseCodes), Array.from(selectedSocketedEtherealSuperiorBaseCodes), Array.from(selectedEndgameCodes), goldFilterEnabled ? { enabled: true, threshold: goldFilterThreshold } : undefined);
  }, [profileName, selectedSetCodes, selectedUniqueCodes, selectedRuneCodes, selectedNormalBaseCodes, selectedMagicBaseCodes, selectedRareBaseCodes, selectedQuestCodes, selectedGemCodes, miscItemRules, selectedSocketedEtherealBaseCodes, selectedNormalSuperiorBaseCodes, selectedSocketedEtherealSuperiorBaseCodes, selectedEndgameCodes, goldFilterEnabled, goldFilterThreshold]);

  const getCsrfToken = useCallback(() => {
    if (csrfToken) return csrfToken;
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : "";
  }, [csrfToken]);

  const handleSaveFilter = useCallback(async () => {
    setLoadError(null);
    const filter = getFilterPayload();
    const payload = { name: filter.name, rules: filter.rules };
    const token = getCsrfToken();
    if (!token) {
      setLoadError("Save failed: CSRF token missing. Refresh the page and try again.");
      return;
    }
    try {
      await axios.post("/api/v2/loot-filters/", {
        name: filter.name,
        description: "",
        payload,
        visibility: "private",
        game_version: "3.1.91636",
        tags: [],
      }, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": token,
        },
      });
      setSaveFeedback(true);
      setFiltersRefresh((n) => n + 1);
      setTimeout(() => setSaveFeedback(false), 2000);
    } catch (err) {
      const msg = axios.isAxiosError(err) && err.response?.data
        ? (typeof err.response.data === "object" && err.response.data !== null && "detail" in err.response.data
          ? String((err.response.data as { detail: unknown }).detail)
          : JSON.stringify(err.response.data))
        : err instanceof Error ? err.message : "Failed to save filter";
      setLoadError(`Save failed: ${msg}`);
    }
  }, [getFilterPayload, getCsrfToken]);

  const totalSelected = selectedSetCodes.size + selectedUniqueCodes.size + selectedRuneCodes.size + selectedNormalBaseCodes.size + selectedSocketedEtherealBaseCodes.size + selectedNormalSuperiorBaseCodes.size + selectedSocketedEtherealSuperiorBaseCodes.size + selectedMagicBaseCodes.size + selectedRareBaseCodes.size + selectedGemCodes.size + selectedPotionCodes.size + selectedQuestCodes.size + selectedEndgameCodes.size + selectedMiscOtherCodes.size;
  const canExport = (totalSelected > 0 || goldFilterEnabled) && ruleCount <= MAX_RULES;

  const selectedSummary = useMemo(() => [
    { label: "Normal", count: selectedNormalBaseCodes.size },
    { label: "S/E", count: selectedSocketedEtherealBaseCodes.size },
    { label: "Norm Sup", count: selectedNormalSuperiorBaseCodes.size },
    { label: "S/E Sup", count: selectedSocketedEtherealSuperiorBaseCodes.size },
    { label: "Magic", count: selectedMagicBaseCodes.size },
    { label: "Rare", count: selectedRareBaseCodes.size },
    { label: "Unique", count: selectedUniqueCodes.size },
    { label: "Sets", count: selectedSetCodes.size },
    { label: "Runes", count: selectedRuneCodes.size },
    { label: "Gems", count: selectedGemCodes.size },
    { label: "Potions", count: selectedPotionCodes.size },
    { label: "Quest", count: selectedQuestCodes.size },
    { label: "Endgame", count: selectedEndgameCodes.size },
    { label: "Misc", count: selectedMiscOtherCodes.size },
  ], [selectedNormalBaseCodes.size, selectedSocketedEtherealBaseCodes.size, selectedNormalSuperiorBaseCodes.size, selectedSocketedEtherealSuperiorBaseCodes.size, selectedMagicBaseCodes.size, selectedRareBaseCodes.size, selectedUniqueCodes.size, selectedSetCodes.size, selectedRuneCodes.size, selectedGemCodes.size, selectedPotionCodes.size, selectedQuestCodes.size, selectedEndgameCodes.size, selectedMiscOtherCodes.size]);

  const tabsConfig = useMemo(() => [
    { id: "normal", label: "Normal", count: baseItemsNormalFiltered.length, selectedCount: selectedNormalBaseCodes.size, accentClass: "text-d2-normal" },
    { id: "socketedEthereal", label: "Socketed / Ethereal", count: baseItemsNormalFiltered.length, selectedCount: selectedSocketedEtherealBaseCodes.size, accentClass: "text-d2-normal" },
    { id: "normalSuperior", label: "Normal Superior", count: baseItemsNormalFiltered.length, selectedCount: selectedNormalSuperiorBaseCodes.size, accentClass: "text-d2-normal" },
    { id: "socketedEtherealSuperior", label: "Socketed / Ethereal Superior", count: baseItemsNormalFiltered.length, selectedCount: selectedSocketedEtherealSuperiorBaseCodes.size, accentClass: "text-d2-normal" },
    { id: "magic", label: "Magic", count: baseItemsFiltered.length, selectedCount: selectedMagicBaseCodes.size, accentClass: "text-d2-magic" },
    { id: "rare", label: "Rare", count: baseItemsRareFiltered.length, selectedCount: selectedRareBaseCodes.size, accentClass: "text-d2-rare" },
    { id: "unique", label: "Unique", count: uniqueItemsFiltered.length, selectedCount: selectedUniqueCodes.size, accentClass: "text-d2-unique" },
    { id: "sets", label: "Sets", count: setItemsFiltered.length, selectedCount: selectedSetCodes.size, accentClass: "text-d2-set" },
    { id: "runes", label: "Runes", count: runeItemsFiltered.length, selectedCount: selectedRuneCodes.size, accentClass: "text-d2-crafted" },
    { id: "gems", label: "Gems", count: gemItemsFiltered.length, selectedCount: selectedGemCodes.size, accentClass: "text-zinc-400" },
    { id: "potions", label: "Potions", count: potionItemsFiltered.length, selectedCount: selectedPotionCodes.size, accentClass: "text-zinc-400" },
    { id: "quest", label: "Quest", count: questItemsFiltered.length, selectedCount: selectedQuestCodes.size, accentClass: "text-d2-quest" },
    { id: "endgame", label: "Endgame", count: endgameItemsFiltered.length, selectedCount: selectedEndgameCodes.size, accentClass: "text-d2-crafted" },
    { id: "misc", label: "Misc", count: miscOtherItemsFiltered.length, selectedCount: selectedMiscOtherCodes.size, accentClass: "text-zinc-400" },
    { id: "gold", label: "Gold", count: 1, selectedCount: goldFilterEnabled ? 1 : 0, accentClass: "text-d2-gold" },
  ], [baseItemsNormalFiltered.length, baseItemsFiltered.length, baseItemsRareFiltered.length, uniqueItemsFiltered.length, setItemsFiltered.length, runeItemsFiltered.length, gemItemsFiltered.length, potionItemsFiltered.length, questItemsFiltered.length, endgameItemsFiltered.length, miscOtherItemsFiltered.length, selectedNormalBaseCodes.size, selectedSocketedEtherealBaseCodes.size, selectedNormalSuperiorBaseCodes.size, selectedSocketedEtherealSuperiorBaseCodes.size, selectedMagicBaseCodes.size, selectedRareBaseCodes.size, selectedUniqueCodes.size, selectedSetCodes.size, selectedRuneCodes.size, selectedGemCodes.size, selectedPotionCodes.size, selectedQuestCodes.size, selectedEndgameCodes.size, selectedMiscOtherCodes.size, goldFilterEnabled]);

  if (loading) return (<main className="min-h-screen flex items-center justify-center p-6"><p className="text-zinc-400">Loading catalogs…</p></main>);
  if (error) return (<main className="min-h-screen flex items-center justify-center p-6"><div className="text-center max-w-md"><p className="text-amber-400 mb-2">{error}</p><p className="text-sm text-zinc-500">Run <code className="bg-zinc-800 px-1 rounded">node copy-catalogs.mjs</code> from the <code className="bg-zinc-800 px-1 rounded">frontend</code> folder (after building catalogs in the repo root).</p></div></main>);

  const FilterDrawer = () => (
    <div className="space-y-5">
      <div><p className="text-xs uppercase tracking-wide text-red-500 mb-2">Filter By Tier</p><div className="space-y-2">{QUALITIES.map((q) => (<label key={q} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={tierFilter.has(q)} onChange={() => toggleTierFilter(q)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900" /><span className="text-sm text-zinc-300 capitalize">{q}</span></label>))}</div></div>
      <div><p className="text-xs uppercase tracking-wide text-red-500 mb-2">Filter By Weight</p><div className="space-y-2">{ARMOR_WEIGHTS.map((w) => (<label key={w} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={weightFilter.has(w)} onChange={() => toggleWeightFilter(w)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900" /><span className="text-sm text-zinc-300 capitalize">{w}</span></label>))}</div></div>
      <div><p className="text-xs uppercase tracking-wide text-red-500 mb-2">Filter By Sockets</p><label className="flex items-center gap-2 cursor-pointer mb-2"><input type="checkbox" checked={socketFilterEnabled} onChange={(e) => setSocketFilterEnabled(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900" /><span className="text-sm text-zinc-300">Enable socket filter</span></label><input type="number" min={1} max={6} step={1} value={socketFilterValue} onChange={(e) => setSocketFilterValue(Math.max(1, Math.min(6, parseInt(e.target.value, 10) || 1)))} disabled={!socketFilterEnabled} className="w-20 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></div>
      <div><p className="text-xs uppercase tracking-wide text-red-500 mb-2">Filter By Category</p><div className="space-y-2">{categoryOptions.map((slot) => (<label key={slot} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={categoryFilter.has(slot)} onChange={() => toggleCategoryFilter(slot)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900" /><span className="text-sm text-zinc-300">{slot}</span></label>))}</div></div>
      <div><p className="text-xs uppercase tracking-wide text-red-500 mb-2">Weapon Handling</p><div className="space-y-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={weaponHandlingFilter.has("1H")} onChange={() => toggleWeaponHandlingFilter("1H")} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900" /><span className="text-sm text-zinc-300">1H</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={weaponHandlingFilter.has("2H")} onChange={() => toggleWeaponHandlingFilter("2H")} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900" /><span className="text-sm text-zinc-300">2H</span></label></div></div>
    </div>
  );

  const renderCatalogPanel = () => {
    const base = `${dataBase}/item-images`;
    if (activeTab === "normal") return <CatalogSection key="normal" title="Normal" items={baseItemsNormalFiltered} selectedCodes={selectedNormalBaseCodes} onToggle={toggleNormalBase} onSelectAll={selectAllNormalBases} onClearAll={clearAllNormalBases} onPaste={pasteNormalBases} accentClass="text-d2-normal" itemColorClass="text-d2-normal" noContainer fillPanel showMaxSockets itemImageBasePath={base} />;
    if (activeTab === "socketedEthereal") return <CatalogSection key="se" title="Socketed / Ethereal" items={baseItemsNormalFiltered} selectedCodes={selectedSocketedEtherealBaseCodes} onToggle={toggleSocketedEtherealBase} onSelectAll={selectAllSocketedEtherealBases} onClearAll={clearAllSocketedEtherealBases} onPaste={pasteSocketedEtherealBases} accentClass="text-d2-normal" itemColorClass="text-d2-normal" noContainer fillPanel showMaxSockets itemImageBasePath={base} />;
    if (activeTab === "normalSuperior") return <CatalogSection key="ns" title="Normal Superior" items={baseItemsNormalFiltered} selectedCodes={selectedNormalSuperiorBaseCodes} onToggle={toggleNormalSuperiorBase} onSelectAll={selectAllNormalSuperiorBases} onClearAll={clearAllNormalSuperiorBases} onPaste={pasteNormalSuperiorBases} accentClass="text-d2-normal" itemColorClass="text-d2-normal" noContainer fillPanel showMaxSockets itemImageBasePath={base} />;
    if (activeTab === "socketedEtherealSuperior") return <CatalogSection key="ses" title="Socketed / Ethereal Superior" items={baseItemsNormalFiltered} selectedCodes={selectedSocketedEtherealSuperiorBaseCodes} onToggle={toggleSocketedEtherealSuperiorBase} onSelectAll={selectAllSocketedEtherealSuperiorBases} onClearAll={clearAllSocketedEtherealSuperiorBases} onPaste={pasteSocketedEtherealSuperiorBases} accentClass="text-d2-normal" itemColorClass="text-d2-normal" noContainer fillPanel showMaxSockets itemImageBasePath={base} />;
    if (activeTab === "magic") return <CatalogSection key="magic" title="Magic" items={baseItemsFiltered} selectedCodes={selectedMagicBaseCodes} onToggle={toggleMagicBase} onSelectAll={selectAllMagicBases} onClearAll={clearAllMagicBases} onPaste={pasteMagicBases} accentClass="text-d2-magic" itemColorClass="text-d2-magic" noContainer fillPanel itemImageBasePath={base} />;
    if (activeTab === "rare") return <CatalogSection key="rare" title="Rare" items={baseItemsRareFiltered} selectedCodes={selectedRareBaseCodes} onToggle={toggleRareBase} onSelectAll={selectAllRareBases} onClearAll={clearAllRareBases} onPaste={pasteRareBases} accentClass="text-d2-rare" itemColorClass="text-d2-rare" noContainer fillPanel itemImageBasePath={base} />;
    if (activeTab === "unique") return <CatalogSection key="unique" title="Unique" items={uniqueItemsFiltered} selectedCodes={selectedUniqueCodes} onToggle={toggleUnique} onSelectAll={selectAllUnique} onClearAll={clearAllUnique} accentClass="text-d2-unique" itemColorClass="text-d2-unique" noContainer fillPanel sortBySlotThenLabel itemImageBasePath={base} maxrollImageBasePath={`${dataBase}/item-unique`} />;
    if (activeTab === "sets") return <CatalogSection key="sets" title="Sets" items={setItemsFiltered} selectedCodes={selectedSetCodes} onToggle={toggleSet} onSelectAll={selectAllSet} onClearAll={clearAllSet} accentClass="text-d2-set" itemColorClass="text-d2-set" noContainer fillPanel itemImageBasePath={base} maxrollImageBasePath={`${dataBase}/item-set`} />;
    if (activeTab === "runes") return <CatalogSection key="runes" title="Runes" items={runeItemsFiltered} selectedCodes={selectedRuneCodes} onToggle={toggleRune} onSelectAll={selectAllRunes} onClearAll={clearAllRunes} accentClass="text-d2-crafted" itemColorClass="text-d2-crafted" noContainer fillPanel sortAlphabetically={false} itemImageBasePath={base} />;
    if (activeTab === "gems") return <CatalogSection key="gems" title="Gems" items={gemItemsFiltered} selectedCodes={selectedGemCodes} onToggle={toggleGem} onSelectAll={selectAllGems} onClearAll={clearAllGems} accentClass="text-zinc-400" itemColorClass="text-zinc-400" noContainer fillPanel sortAlphabetically={false} itemImageBasePath={base} />;
    if (activeTab === "potions") return <CatalogSection key="potions" title="Potions" items={potionItemsFiltered} selectedCodes={selectedPotionCodes} onToggle={togglePotion} onSelectAll={selectAllPotions} onClearAll={clearAllPotions} accentClass="text-zinc-400" itemColorClass="text-zinc-400" noContainer fillPanel sortAlphabetically={false} itemImageBasePath={base} />;
    if (activeTab === "quest") return <CatalogSection key="quest" title="Quest" items={questItemsFiltered} selectedCodes={selectedQuestCodes} onToggle={toggleQuest} onSelectAll={selectAllQuest} onClearAll={clearAllQuest} accentClass="text-d2-quest" itemColorClass="text-d2-quest" noContainer fillPanel sortAlphabetically={false} itemImageBasePath={base} />;
    if (activeTab === "endgame") return <CatalogSection key="endgame" title="Endgame" items={endgameItemsFiltered} selectedCodes={selectedEndgameCodes} onToggle={toggleEndgame} onSelectAll={selectAllEndgame} onClearAll={clearAllEndgame} accentClass="text-d2-crafted" itemColorClass="text-d2-crafted" noContainer fillPanel sortAlphabetically={false} itemImageBasePath={base} />;
    if (activeTab === "misc") return <CatalogSection key="misc" title="Misc" items={miscOtherItemsFiltered} selectedCodes={selectedMiscOtherCodes} onToggle={toggleMiscOther} onSelectAll={selectAllMiscOther} onClearAll={clearAllMiscOther} accentClass="text-zinc-400" itemColorClass="text-zinc-400" noContainer fillPanel itemImageBasePath={base} />;
    if (activeTab === "gold") return (<div className="flex flex-col gap-6 p-4 flex-1 min-h-0 overflow-auto"><div className="flex flex-col gap-4 max-w-md"><h2 className="text-lg font-medium text-d2-gold">Gold Filter</h2><p className="text-sm text-zinc-400">Hide small gold piles and show only gold above a threshold.</p><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={goldFilterEnabled} onChange={(e) => setGoldFilterEnabled(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-d2-gold focus:ring-d2-gold focus:ring-offset-zinc-900" /><span className="text-zinc-300">Enable gold filter</span></label><label className="flex flex-col gap-2"><span className="text-sm text-zinc-400">Minimum gold to show</span><input type="number" min={1} max={99999999} step={1000} value={goldFilterThreshold} onChange={(e) => setGoldFilterThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))} disabled={!goldFilterEnabled} className="w-32 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-d2-gold disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></label></div></div>);
    return null;
  };

  if (mobile) {
    return (
      <>
        <main className="h-[100dvh] flex flex-col overflow-hidden bg-[var(--bg)]">
          <header className="flex-shrink-0 border-b border-zinc-700/60 bg-zinc-900/90 z-40">
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 gap-y-2 flex-wrap">
                <img src={`${dataBase}/imgs/logo.png`} alt="" className="h-10 w-10 flex-shrink-0 object-contain" />
                <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="MyFilter" className="flex-1 min-w-0 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <button type="button" onClick={() => setShowFiltersModal(true)} title="Open filter menu" className="flex-shrink-0 ml-auto w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white active:bg-zinc-500 touch-manipulation" aria-label="Open filter menu">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
                </button>
              </div>
              {(loadError || copyFeedback) && (
                <div className="mt-2 min-h-[1.25rem]">
                  {loadError && <p className="text-xs text-red-400" role="alert">{loadError}</p>}
                  {copyFeedback && <p className="text-xs text-emerald-400">Copied!</p>}
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-full bg-zinc-700/80 px-2 py-0.5 text-[10px] text-zinc-300">Selected {totalSelected}</span>
                <span className={`inline-flex items-center rounded-full bg-zinc-700/80 px-2 py-0.5 text-[10px] tabular-nums ${ruleCount > MAX_RULES ? "text-amber-400" : "text-zinc-300"}`}>Rules {ruleCount}/{MAX_RULES}</span>
              </div>
            </div>
          </header>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-3 pt-3">
            <div className="flex-shrink-0 mb-3">
              <select value={activeTab} onChange={(e) => setActiveTab(e.target.value)} className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-3 text-base text-white font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.5rem] bg-[right_0.5rem_center] bg-no-repeat pr-10">
                {TABS.map((t) => (<option key={t.id} value={t.id}>{t.label}{t.id !== "gold" ? ` (${tabsConfig.find((c) => c.id === t.id)?.selectedCount ?? 0})` : goldFilterEnabled ? " ✓" : ""}</option>))}
              </select>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-zinc-700/60 bg-zinc-900/50 flex flex-col pb-[max(4rem,calc(4rem+env(safe-area-inset-bottom)))]">
              {renderCatalogPanel()}
            </div>
          </div>

          <div ref={mobileMenuRef} className="fixed bottom-0 left-0 right-0 z-40 flex flex-col bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-700/60 pb-[env(safe-area-inset-bottom)]">
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleLoadFilter} className="hidden" aria-hidden />
            <nav className="flex items-center justify-around py-1 px-1" role="menubar" aria-label="Mobile menu">
              {/* Actions */}
              <div className="relative flex-1 min-w-0">
                <button type="button" onClick={() => setMobileDropdown((p) => (p === "actions" ? null : "actions"))} className="flex flex-col items-center justify-center gap-0.5 w-full py-1 px-0.5 text-zinc-400 hover:text-white active:text-white touch-manipulation transition-colors" aria-haspopup="true" aria-expanded={mobileDropdown === "actions"}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                  <span className="text-[9px] font-medium">Actions</span>
                </button>
                {mobileDropdown === "actions" && (
                  <div className="absolute left-0 bottom-full mb-1 min-w-[200px] py-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50" role="menu">
                    <button type="button" onClick={() => { fileInputRef.current?.click(); setMobileDropdown(null); }} className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-600/50 active:bg-zinc-600" role="menuitem">Load File</button>
                    <button type="button" onClick={() => { setShowPastePanel(true); setLoadError(null); setPasteInput(""); setMobileDropdown(null); }} className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-600/50 active:bg-zinc-600" role="menuitem">Load From Clipboard</button>
                    <button type="button" onClick={() => { handleSaveFilter(); setMobileDropdown(null); }} disabled={!user || !canExport} className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-600/50 active:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed" role="menuitem">Save filter to profile</button>
                    <hr className="my-1 border-zinc-600" />
                    <button type="button" onClick={() => { handleExportJson(); setMobileDropdown(null); }} disabled={!canExport} className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-600/50 active:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed" role="menuitem">Download File</button>
                    <button type="button" onClick={() => { handleCopyToClipboard(); setMobileDropdown(null); }} disabled={!canExport} className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-600/50 active:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed" role="menuitem">Copy To Clipboard</button>
                  </div>
                )}
              </div>
              {/* Presets */}
              <div className="relative flex-1 min-w-0">
                <button type="button" onClick={() => setMobileDropdown((p) => (p === "presets" ? null : "presets"))} className="flex flex-col items-center justify-center gap-0.5 w-full py-1 px-0.5 text-zinc-400 hover:text-white active:text-white touch-manipulation transition-colors" aria-haspopup="true" aria-expanded={mobileDropdown === "presets"}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  <span className="text-[9px] font-medium">Presets</span>
                </button>
                {mobileDropdown === "presets" && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 min-w-[220px] max-h-[50vh] overflow-y-auto py-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50" role="menu">
                    {presets.length === 0 ? (
                      <div className="px-3 py-4 text-zinc-500 text-sm text-center">No curated presets yet.</div>
                    ) : (
                      presets.map((p) => (
                        <button key={p.id} type="button" onClick={() => { handleLoadFilterPayload(p.payload); setMobileDropdown(null); }} className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-600/50 active:bg-zinc-600 truncate" role="menuitem">{p.name}</button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {/* Filters */}
              <div className="relative flex-1 min-w-0">
                <button type="button" onClick={() => setMobileDropdown((p) => (p === "filters" ? null : "filters"))} className="flex flex-col items-center justify-center gap-0.5 w-full py-1 px-0.5 text-zinc-400 hover:text-white active:text-white touch-manipulation transition-colors" aria-haspopup="true" aria-expanded={mobileDropdown === "filters"}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  <span className="text-[9px] font-medium">Filters</span>
                </button>
                {mobileDropdown === "filters" && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 min-w-[220px] max-h-[50vh] overflow-y-auto py-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50" role="menu">
                    {!user ? (
                      <div className="px-3 py-4 text-zinc-500 text-sm text-center"><Link href={`/auth/login/?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`} className="text-violet-400">Log in</Link> to see your saved filters.</div>
                    ) : userFilters.length === 0 ? (
                      <div className="px-3 py-4 text-zinc-500 text-sm text-center">No saved filters. (Max 16)</div>
                    ) : (
                      <>
                        <div className="px-3 py-2 text-xs text-zinc-500 border-b border-zinc-600/50">{userFilters.length} / 16 filters</div>
                        {userFilters.map((f) => (
                          <button key={f.id} type="button" onClick={() => { handleLoadFilterPayload(f.payload); setMobileDropdown(null); }} className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-600/50 active:bg-zinc-600 truncate" role="menuitem">{f.name}</button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              {/* Help */}
              <div className="relative flex-1 min-w-0">
                <button type="button" onClick={() => setMobileDropdown((p) => (p === "help" ? null : "help"))} className="flex flex-col items-center justify-center gap-0.5 w-full py-1 px-0.5 text-zinc-400 hover:text-white active:text-white touch-manipulation transition-colors" aria-haspopup="true" aria-expanded={mobileDropdown === "help"}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span className="text-[9px] font-medium">Help</span>
                </button>
                {mobileDropdown === "help" && (
                  <div className="absolute right-0 bottom-full mb-1 min-w-[200px] py-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50" role="menu">
                    <a href="https://github.com/VideoGameRoulette/D2RLootFilters/issues" target="_blank" rel="noopener noreferrer" className="block px-3 py-2 text-zinc-200 hover:bg-zinc-600/50 active:bg-zinc-600" role="menuitem" onClick={() => setMobileDropdown(null)}>GitHub Issues</a>
                  </div>
                )}
              </div>
              {/* Auth */}
              <div className="relative flex-1 min-w-0">
                {user ? (
                  <>
                    <button type="button" onClick={() => setMobileDropdown((p) => (p === "auth" ? null : "auth"))} className="flex flex-col items-center justify-center gap-0.5 w-full py-1 px-0.5 text-zinc-400 hover:text-white active:text-white touch-manipulation transition-colors" aria-haspopup="true" aria-expanded={mobileDropdown === "auth"}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      <span className="text-[9px] font-medium truncate max-w-[48px]">{user.username}</span>
                    </button>
                    {mobileDropdown === "auth" && (
                      <div className="absolute right-0 bottom-full mb-1 min-w-[140px] py-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50" role="menu">
                        <Link href="/auth/logout/" className="block px-3 py-2 text-zinc-200 hover:bg-zinc-600/50 active:bg-zinc-600" role="menuitem" onClick={() => setMobileDropdown(null)}>Logout</Link>
                      </div>
                    )}
                  </>
                ) : (
                  <Link href={`/auth/login/?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`} className="flex flex-col items-center justify-center gap-0.5 w-full py-1 px-0.5 text-zinc-400 hover:text-white active:text-white touch-manipulation transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                    <span className="text-[9px] font-medium">Login</span>
                  </Link>
                )}
              </div>
            </nav>
            <footer className="flex-shrink-0 px-2 py-0.5 border-t border-zinc-800/50">
              <p className="text-center text-[8px] text-zinc-600 truncate">v3.1.91735 · © In-House Cloud Solutions · Blizzard · Vicarious Visions</p>
            </footer>
          </div>
        </main>

        {showFiltersModal && (<div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col bg-zinc-900"><div className="flex items-center justify-between p-4 border-b border-zinc-700"><h2 className="text-lg font-semibold text-white">Filters</h2><div className="flex items-center gap-2 ml-auto"><button type="button" onClick={() => { setTierFilter(new Set()); setWeightFilter(new Set()); setSocketFilterEnabled(false); setCategoryFilter(new Set()); setWeaponHandlingFilter(new Set()); }} title="Reset filters" className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white active:bg-zinc-500 touch-manipulation" aria-label="Reset filters"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg></button><button type="button" onClick={() => setShowFiltersModal(false)} title="Close filter menu" className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-500 active:bg-red-700 touch-manipulation" aria-label="Close filter menu"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></div></div><div className="flex-1 overflow-y-auto p-4"><FilterDrawer /></div></div>)}

        {showPastePanel && (<div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col bg-zinc-900 p-4"><h2 className="text-lg font-semibold text-white mb-3">Paste filter JSON</h2><textarea value={pasteInput} onChange={(e) => setPasteInput(e.target.value)} placeholder='{"name":"MyFilter","rules":[...]}' rows={8} className="flex-1 min-h-[120px] w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />{loadError && <p className="text-sm text-red-400 mt-2" role="alert">{loadError}</p>}<div className="mt-4 flex gap-2"><button type="button" onClick={handleLoadFromPaste} disabled={!pasteInput.trim()} className="flex-1 py-3 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50 touch-manipulation">Load</button><button type="button" onClick={() => { setShowPastePanel(false); setPasteInput(""); setLoadError(null); }} className="flex-1 py-3 rounded-xl bg-zinc-600 text-zinc-300 font-medium touch-manipulation">Cancel</button></div></div>)}
      </>
    );
  }

  return (
    <>
      <main className="h-screen overflow-hidden flex flex-col">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full">
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleLoadFilter} className="hidden" aria-hidden />
          <Toolbar
            onLoadFile={() => fileInputRef.current?.click()}
            onLoadFromClipboard={() => { setShowPastePanel(true); setLoadError(null); setPasteInput(""); }}
            onExportFile={handleExportJson}
            onCopyToClipboard={handleCopyToClipboard}
            onSaveFilter={handleSaveFilter}
            onLoadFilter={handleLoadFilterPayload}
            onMobileView={() => router.push("/mobile")}
            canExport={canExport}
            presets={presets}
            userFilters={userFilters}
            userFilterCount={userFilters.length}
            maxUserFilters={16}
            dataBase={dataBase}
            logoUrl={`${dataBase}/imgs/logo.png`}
          />
          <header className="flex-shrink-0 border-b border-zinc-700/60 bg-zinc-900/70">
            <div className="px-4 md:px-6 lg:px-8 py-3">
              <div className="flex flex-wrap items-center gap-4 gap-y-3">
                {!showFilterDrawer && (<button type="button" onClick={() => setShowFilterDrawer(true)} aria-label="Open filters" className="p-2 rounded-lg bg-zinc-700 text-white border border-zinc-600 hover:bg-zinc-600"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg></button>)}
                <label className="flex items-center gap-2"><span className="text-zinc-500 text-sm">Profile name</span><input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="MyFilter (no spaces)" className="bg-zinc-800/80 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent max-w-[200px]" /></label>
                <span className={`text-sm font-medium tabular-nums ${ruleCount > MAX_RULES ? "text-amber-400" : "text-zinc-400"}`} title={ruleCount > MAX_RULES ? `Game allows max ${MAX_RULES} rules.` : undefined}>Rules: {ruleCount} / {MAX_RULES}</span>
                <div className="text-xs text-zinc-500 border-l border-zinc-600/80 pl-4 hidden sm:block">Selected: Normal {selectedNormalBaseCodes.size} · Socketed / Ethereal {selectedSocketedEtherealBaseCodes.size} · Normal Superior {selectedNormalSuperiorBaseCodes.size} · Socketed / Ethereal Superior {selectedSocketedEtherealSuperiorBaseCodes.size} · Magic {selectedMagicBaseCodes.size} · Rare {selectedRareBaseCodes.size} · Unique {selectedUniqueCodes.size} · Sets {selectedSetCodes.size} · Runes {selectedRuneCodes.size} · Gems {selectedGemCodes.size} · Potions {selectedPotionCodes.size} · Quest {selectedQuestCodes.size} · Endgame {selectedEndgameCodes.size} · Misc {selectedMiscOtherCodes.size}</div>
                {loadError && <span className="text-xs text-red-400 ml-auto" role="alert">{loadError}</span>}
                {copyFeedback && <span className="text-xs text-emerald-400 ml-auto">Copied!</span>}
                {saveFeedback && <span className="text-xs text-emerald-400 ml-auto">Saved!</span>}
              </div>
            </div>
          </header>

          <div className="flex-shrink-0 px-4 md:px-6 lg:px-8 py-3 bg-zinc-900/30 border-b border-zinc-800/50 sm:hidden"><div className="text-xs text-zinc-500">Selected: Normal {selectedNormalBaseCodes.size} · S/E {selectedSocketedEtherealBaseCodes.size} · Magic {selectedMagicBaseCodes.size} · Rare {selectedRareBaseCodes.size} · Unique {selectedUniqueCodes.size} · Sets {selectedSetCodes.size} · Runes {selectedRuneCodes.size} · Gems {selectedGemCodes.size} · Potions {selectedPotionCodes.size} · Quest {selectedQuestCodes.size} · Endgame {selectedEndgameCodes.size} · Misc {selectedMiscOtherCodes.size}</div></div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 md:px-6 lg:px-8 py-4">
            <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
              {showFilterDrawer && (<aside className="w-72 max-w-[45vw] h-full self-stretch border border-zinc-700/60 rounded-xl bg-zinc-900/50 p-4 overflow-y-auto scrollbar-thin flex-shrink-0"><div className="flex items-center justify-between mb-3"><h2 className="text-sm font-semibold text-white">Filters</h2><button type="button" onClick={() => setShowFilterDrawer(false)} aria-label="Close filters" className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-600 text-zinc-300 hover:bg-zinc-700">✕</button></div><button type="button" onClick={() => { setTierFilter(new Set()); setWeightFilter(new Set()); setSocketFilterEnabled(false); setCategoryFilter(new Set()); setWeaponHandlingFilter(new Set()); }} className="text-xs text-zinc-500 hover:text-white focus:outline-none mb-4">Reset filters</button><FilterDrawer /></aside>)}

              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <CatalogTabs tabs={tabsConfig} activeTabId={activeTab} onTabChange={setActiveTab}>
                  {renderCatalogPanel()}
                </CatalogTabs>
              </div>
            </div>
          </div>

          <footer className="flex-shrink-0 border-t border-zinc-700/60 bg-zinc-900/50 px-4 md:px-6 lg:px-8 py-2">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-500">
              v3.1.91735 · © In-House Cloud Solutions · Blizzard · Vicarious Visions
            </div>
          </footer>
        </div>
      </main>

      {showPastePanel && (<div role="dialog" aria-modal="true" aria-labelledby="paste-dialog-title" className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/60" onClick={() => { setShowPastePanel(false); setPasteInput(""); setLoadError(null); }} aria-hidden /><div className="relative w-full max-w-lg rounded-xl bg-zinc-900 border border-zinc-600 shadow-xl p-4"><h2 id="paste-dialog-title" className="text-lg font-semibold text-white mb-3">Paste filter JSON</h2><textarea id="paste-filter" value={pasteInput} onChange={(e) => setPasteInput(e.target.value)} placeholder='{"name":"MyFilter","rules":[...]}' rows={8} className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y min-h-[160px]" />{loadError && <p className="mt-2 text-sm text-red-400" role="alert">{loadError}</p>}<div className="mt-4 flex items-center gap-2"><button type="button" onClick={handleLoadFromPaste} disabled={!pasteInput.trim()} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900">Load</button><button type="button" onClick={() => { setShowPastePanel(false); setPasteInput(""); setLoadError(null); }} className="px-4 py-2 rounded-lg bg-zinc-600 text-zinc-300 text-sm font-medium hover:bg-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900">Cancel</button></div></div></div>)}
    </>
  );
}
