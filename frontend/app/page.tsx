"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type {
  BasesCatalog,
  EquipmentQuality,
  ArmorWeightClass,
  GemsCatalog,
  PotionsCatalog,
  QuestCatalog,
  MiscCatalog,
  FilterRule,
  LootFilter,
} from "@/lib/types";

const QUALITIES: EquipmentQuality[] = ["normal", "exceptional", "elite"];
const ARMOR_WEIGHTS: ArmorWeightClass[] = ["light", "medium", "heavy"];
const WEAPON_HANDLING_OPTIONS = ["1H", "2H"] as const;
type WeaponHandling = (typeof WEAPON_HANDLING_OPTIONS)[number];
const SLOT_FILTER_ORDER = [
  "Helm",
  "Armor",
  "Weapon",
  "Shield",
  "Gloves",
  "Belt",
  "Boots",
  "Ring",
  "Amulet",
  "Charm",
  "Other",
];

const MAX_RULES = 32;

const TAB_ORDER = [
  "normal",
  "socketedEthereal",
  "normalSuperior",
  "socketedEtherealSuperior",
  "magic",
  "rare",
  "unique",
  "sets",
  "runes",
  "gems",
  "potions",
  "quest",
  "endgame",
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

/** Quest catalog codes that belong to Endgame (tokens, essences, keys, organs, etc.). */
const ENDGAME_CODES = [
  "tes",
  "ceh",
  "bet",
  "fed",
  "toa", // Essence / Token of Absolution
  "xa1",
  "xa2",
  "xa3",
  "xa4",
  "xa5", // Terrorize Tokens (Worldstone Shards)
  "pk1",
  "pk2",
  "pk3",
  "mbr",
  "dhn",
  "bey",
  "std",
  "ua1",
  "ua2",
  "ua3",
  "ua4",
  "ua5", // Uber Materials
] as const;

export default function Home() {
  const [setsCatalog, setSetsCatalog] = useState<Catalog | null>(null);
  const [uniquesCatalog, setUniquesCatalog] = useState<Catalog | null>(null);
  const [profileName, setProfileName] = useState("MyFilter");
  const [selectedSetCodes, setSelectedSetCodes] = useState<Set<string>>(
    new Set(),
  );
  const [selectedUniqueCodes, setSelectedUniqueCodes] = useState<Set<string>>(
    new Set(),
  );
  const [selectedRuneCodes, setSelectedRuneCodes] = useState<Set<string>>(
    new Set(),
  );
  const [basesCatalog, setBasesCatalog] = useState<BasesCatalog | null>(null);
  const [gemsCatalog, setGemsCatalog] = useState<GemsCatalog | null>(null);
  const [potionsCatalog, setPotionsCatalog] = useState<PotionsCatalog | null>(
    null,
  );
  const [questCatalog, setQuestCatalog] = useState<QuestCatalog | null>(null);
  const [miscCatalog, setMiscCatalog] = useState<MiscCatalog | null>(null);
  const [selectedNormalBaseCodes, setSelectedNormalBaseCodes] = useState<
    Set<string>
  >(new Set());
  const [
    selectedSocketedEtherealBaseCodes,
    setSelectedSocketedEtherealBaseCodes,
  ] = useState<Set<string>>(new Set());
  const [selectedNormalSuperiorBaseCodes, setSelectedNormalSuperiorBaseCodes] =
    useState<Set<string>>(new Set());
  const [
    selectedSocketedEtherealSuperiorBaseCodes,
    setSelectedSocketedEtherealSuperiorBaseCodes,
  ] = useState<Set<string>>(new Set());
  const [selectedMagicBaseCodes, setSelectedMagicBaseCodes] = useState<
    Set<string>
  >(new Set());
  const [selectedRareBaseCodes, setSelectedRareBaseCodes] = useState<
    Set<string>
  >(new Set());
  const [selectedGemCodes, setSelectedGemCodes] = useState<Set<string>>(
    new Set(),
  );
  const [selectedPotionCodes, setSelectedPotionCodes] = useState<Set<string>>(
    new Set(),
  );
  const [selectedQuestCodes, setSelectedQuestCodes] = useState<Set<string>>(
    new Set(),
  );
  const [selectedEndgameCodes, setSelectedEndgameCodes] = useState<Set<string>>(
    new Set(),
  );
  const [selectedMiscOtherCodes, setSelectedMiscOtherCodes] = useState<
    Set<string>
  >(new Set());
  const [goldFilterEnabled, setGoldFilterEnabled] = useState(false);
  const [goldFilterThreshold, setGoldFilterThreshold] = useState(5000);
  const [showFilterDrawer, setShowFilterDrawer] = useState(true);
  const [tierFilter, setTierFilter] = useState<Set<EquipmentQuality>>(
    () => new Set(),
  );
  const [weightFilter, setWeightFilter] = useState<Set<ArmorWeightClass>>(
    () => new Set(),
  );
  const [socketFilterEnabled, setSocketFilterEnabled] = useState(false);
  const [socketFilterValue, setSocketFilterValue] = useState(4);
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [weaponHandlingFilter, setWeaponHandlingFilter] = useState<
    Set<WeaponHandling>
  >(() => new Set());
  const [activeTab, setActiveTab] = useState<string>(TAB_ORDER[0]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showPastePanel, setShowPastePanel] = useState(false);
  const [pasteInput, setPasteInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dataBase =
    typeof process.env.NEXT_PUBLIC_BASE_PATH === "string"
      ? process.env.NEXT_PUBLIC_BASE_PATH
      : "";

  useEffect(() => {
    Promise.all([
      fetch(`${dataBase}/data/catalog.sets.json`).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("Sets catalog not found")),
      ),
      fetch(`${dataBase}/data/catalog.uniques.json`).then((r) =>
        r.ok
          ? r.json()
          : Promise.reject(new Error("Uniques catalog not found")),
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
      fetch(`${dataBase}/data/catalog.misc.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
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
    const baseItems = setsCatalog
      ? catalogToSelectableItems(setsCatalog, "set")
      : [];
    return baseItems.map((item) => ({
      ...item,
      ...(baseStatsByCode.get(item.code) ?? {}),
    }));
  }, [setsCatalog, baseStatsByCode]);
  const uniqueItems = useMemo<SelectableItem[]>(() => {
    const baseItems = uniquesCatalog
      ? catalogToSelectableItems(uniquesCatalog, "unique")
      : [];
    return baseItems.map((item) => {
      const baseCode = item.codes[0];
      return {
        ...item,
        ...(baseCode ? baseStatsByCode.get(baseCode) ?? {} : {}),
      };
    });
  }, [uniquesCatalog, baseStatsByCode]);

  const runeItems = useMemo<SelectableItem[]>(
    () =>
      RUNES.map((r) => ({
        code: r.code,
        codes: [r.code],
        label: r.name,
        rarity: "unique" as const,
      })),
    [],
  );

  const runeCodeSet = useMemo(() => new Set(RUNES.map((r) => r.code)), []);

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
    [basesCatalog],
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
    [basesCatalog],
  );

  const baseItemsNormal = useMemo<SelectableItem[]>(
    () =>
      basesCatalog
        ? basesToSelectableItems(basesCatalog, {
            excludeSlotOther: true,
            excludeSlots: ["Ring", "Amulet"],
          })
        : [],
    [basesCatalog],
  );

  const toggleTierFilter = useCallback((q: EquipmentQuality) => {
    setTierFilter((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });
  }, []);
  const toggleWeightFilter = useCallback((w: ArmorWeightClass) => {
    setWeightFilter((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
  }, []);
  const toggleCategoryFilter = useCallback((slot: string) => {
    setCategoryFilter((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  }, []);
  const toggleWeaponHandlingFilter = useCallback((value: WeaponHandling) => {
    setWeaponHandlingFilter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const gemItems = useMemo(
    () => gemsToSelectableItems(gemsCatalog),
    [gemsCatalog],
  );
  const potionItems = useMemo(
    () => potionsToSelectableItems(potionsCatalog),
    [potionsCatalog],
  );
  const endgameCodeSet = useMemo(() => new Set<string>(ENDGAME_CODES), []);
  const fullQuestItems = useMemo(
    () => questToSelectableItems(questCatalog),
    [questCatalog],
  );
  const questItems = useMemo(
    () => fullQuestItems.filter((i) => !endgameCodeSet.has(i.code)),
    [fullQuestItems, endgameCodeSet],
  );
  const endgameItems = useMemo(
    () => fullQuestItems.filter((i) => endgameCodeSet.has(i.code)),
    [fullQuestItems, endgameCodeSet],
  );

  const gemCodeSet = useMemo(
    () => new Set(gemItems.flatMap((i) => i.codes)),
    [gemItems],
  );
  const potionCodeSet = useMemo(
    () => new Set(potionItems.flatMap((i) => i.codes)),
    [potionItems],
  );
  const questCodeSet = useMemo(
    () => new Set(questItems.flatMap((i) => i.codes)),
    [questItems],
  );

  const miscItems = useMemo(
    () => miscToSelectableItems(miscCatalog),
    [miscCatalog],
  );

  const miscOtherItems = useMemo(
    () =>
      miscItems.filter(
        (item) => !jewelCodeSet.has(item.code) && item.code !== "gld",
      ),
    [miscItems, jewelCodeSet],
  );

  const categoryOptions = useMemo(() => {
    const allItems = [
      ...baseItemsNormal,
      ...baseItems,
      ...baseItemsRare,
      ...uniqueItems,
      ...setItems,
      ...runeItems,
      ...gemItems,
      ...potionItems,
      ...questItems,
      ...endgameItems,
      ...miscOtherItems,
    ];
    const categorySet = new Set<string>();
    for (const item of allItems) {
      if (item.slot) categorySet.add(item.slot);
    }
    return [...categorySet].sort((a, b) => {
      const ai = SLOT_FILTER_ORDER.indexOf(a);
      const bi = SLOT_FILTER_ORDER.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  }, [
    baseItemsNormal,
    baseItems,
    baseItemsRare,
    uniqueItems,
    setItems,
    runeItems,
    gemItems,
    potionItems,
    questItems,
    endgameItems,
    miscOtherItems,
  ]);

  const applyGlobalFilters = useCallback(
    (items: SelectableItem[]) => {
      return items.filter((item) => {
        if (tierFilter.size > 0) {
          if (!item.quality || !tierFilter.has(item.quality)) return false;
        }
        if (weightFilter.size > 0) {
          if (
            !item.armorWeightClass ||
            !weightFilter.has(item.armorWeightClass)
          )
            return false;
        }
        if (categoryFilter.size > 0) {
          if (!item.slot || !categoryFilter.has(item.slot)) return false;
        }
        if (weaponHandlingFilter.size > 0) {
          const hasOneHand = Boolean(item.oneHandDamage);
          const hasTwoHand = Boolean(item.twoHandDamage);
          const matchesOneHand = weaponHandlingFilter.has("1H") && hasOneHand;
          const matchesTwoHand = weaponHandlingFilter.has("2H") && hasTwoHand;
          if (!matchesOneHand && !matchesTwoHand) return false;
        }
        if (socketFilterEnabled) {
          if (
            typeof item.maxSockets !== "number" ||
            !Number.isFinite(item.maxSockets) ||
            item.maxSockets < socketFilterValue
          ) {
            return false;
          }
        }
        return true;
      });
    },
    [
      tierFilter,
      weightFilter,
      categoryFilter,
      weaponHandlingFilter,
      socketFilterEnabled,
      socketFilterValue,
    ],
  );

  const baseItemsNormalFiltered = useMemo(
    () => applyGlobalFilters(baseItemsNormal),
    [applyGlobalFilters, baseItemsNormal],
  );
  const baseItemsFiltered = useMemo(
    () => applyGlobalFilters(baseItems),
    [applyGlobalFilters, baseItems],
  );
  const baseItemsRareFiltered = useMemo(
    () => applyGlobalFilters(baseItemsRare),
    [applyGlobalFilters, baseItemsRare],
  );
  const uniqueItemsFiltered = useMemo(
    () => applyGlobalFilters(uniqueItems),
    [applyGlobalFilters, uniqueItems],
  );
  const setItemsFiltered = useMemo(
    () => applyGlobalFilters(setItems),
    [applyGlobalFilters, setItems],
  );
  const runeItemsFiltered = useMemo(
    () => applyGlobalFilters(runeItems),
    [applyGlobalFilters, runeItems],
  );
  const gemItemsFiltered = useMemo(
    () => applyGlobalFilters(gemItems),
    [applyGlobalFilters, gemItems],
  );
  const potionItemsFiltered = useMemo(
    () => applyGlobalFilters(potionItems),
    [applyGlobalFilters, potionItems],
  );
  const questItemsFiltered = useMemo(
    () => applyGlobalFilters(questItems),
    [applyGlobalFilters, questItems],
  );
  const endgameItemsFiltered = useMemo(
    () => applyGlobalFilters(endgameItems),
    [applyGlobalFilters, endgameItems],
  );
  const miscOtherItemsFiltered = useMemo(
    () => applyGlobalFilters(miscOtherItems),
    [applyGlobalFilters, miscOtherItems],
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
    setSelectedSetCodes(new Set(setItemsFiltered.flatMap((i) => i.codes)));
  }, [setItemsFiltered]);

  const clearAllSet = useCallback(() => {
    setSelectedSetCodes(new Set());
  }, []);

  const selectAllUnique = useCallback(() => {
    setSelectedUniqueCodes(
      new Set(uniqueItemsFiltered.flatMap((i) => i.codes)),
    );
  }, [uniqueItemsFiltered]);

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
    setSelectedRuneCodes(new Set(runeItemsFiltered.flatMap((i) => i.codes)));
  }, [runeItemsFiltered]);

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
  const toggleNormalSuperiorBase = useCallback((codes: string[]) => {
    setSelectedNormalSuperiorBaseCodes((prev) => {
      const next = new Set(prev);
      const allSelected = codes.every((c) => next.has(c));
      if (allSelected) codes.forEach((c) => next.delete(c));
      else codes.forEach((c) => next.add(c));
      return next;
    });
  }, []);
  const toggleSocketedEtherealSuperiorBase = useCallback((codes: string[]) => {
    setSelectedSocketedEtherealSuperiorBaseCodes((prev) => {
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
    setSelectedNormalBaseCodes(
      new Set(baseItemsNormalFiltered.flatMap((i) => i.codes)),
    );
  }, [baseItemsNormalFiltered]);
  const selectAllSocketedEtherealBases = useCallback(() => {
    setSelectedSocketedEtherealBaseCodes(
      new Set(baseItemsNormalFiltered.flatMap((i) => i.codes)),
    );
  }, [baseItemsNormalFiltered]);
  const selectAllNormalSuperiorBases = useCallback(() => {
    setSelectedNormalSuperiorBaseCodes(
      new Set(baseItemsNormalFiltered.flatMap((i) => i.codes)),
    );
  }, [baseItemsNormalFiltered]);
  const selectAllSocketedEtherealSuperiorBases = useCallback(() => {
    setSelectedSocketedEtherealSuperiorBaseCodes(
      new Set(baseItemsNormalFiltered.flatMap((i) => i.codes)),
    );
  }, [baseItemsNormalFiltered]);
  const selectAllMagicBases = useCallback(() => {
    setSelectedMagicBaseCodes(
      new Set(baseItemsFiltered.flatMap((i) => i.codes)),
    );
  }, [baseItemsFiltered]);
  const selectAllRareBases = useCallback(() => {
    setSelectedRareBaseCodes(
      new Set(baseItemsRareFiltered.flatMap((i) => i.codes)),
    );
  }, [baseItemsRareFiltered]);

  const clearAllNormalBases = useCallback(
    () => setSelectedNormalBaseCodes(new Set()),
    [],
  );
  const clearAllSocketedEtherealBases = useCallback(
    () => setSelectedSocketedEtherealBaseCodes(new Set()),
    [],
  );
  const clearAllNormalSuperiorBases = useCallback(
    () => setSelectedNormalSuperiorBaseCodes(new Set()),
    [],
  );
  const clearAllSocketedEtherealSuperiorBases = useCallback(
    () => setSelectedSocketedEtherealSuperiorBaseCodes(new Set()),
    [],
  );
  const clearAllMagicBases = useCallback(
    () => setSelectedMagicBaseCodes(new Set()),
    [],
  );
  const clearAllRareBases = useCallback(
    () => setSelectedRareBaseCodes(new Set()),
    [],
  );

  const validCodesForItems = useCallback(
    (codes: string[], itemList: { codes: string[] }[]) => {
      const codeSet = new Set(itemList.flatMap((i) => i.codes));
      return codes.filter((c) => codeSet.has(c));
    },
    [],
  );

  const pasteNormalBases = useCallback(
    (codes: string[]) => {
      const valid = validCodesForItems(codes, baseItemsNormalFiltered);
      if (valid.length > 0)
        setSelectedNormalBaseCodes((prev) => new Set([...prev, ...valid]));
    },
    [baseItemsNormalFiltered, validCodesForItems],
  );
  const pasteSocketedEtherealBases = useCallback(
    (codes: string[]) => {
      const valid = validCodesForItems(codes, baseItemsNormalFiltered);
      if (valid.length > 0)
        setSelectedSocketedEtherealBaseCodes(
          (prev) => new Set([...prev, ...valid]),
        );
    },
    [baseItemsNormalFiltered, validCodesForItems],
  );
  const pasteNormalSuperiorBases = useCallback(
    (codes: string[]) => {
      const valid = validCodesForItems(codes, baseItemsNormalFiltered);
      if (valid.length > 0)
        setSelectedNormalSuperiorBaseCodes(
          (prev) => new Set([...prev, ...valid]),
        );
    },
    [baseItemsNormalFiltered, validCodesForItems],
  );
  const pasteSocketedEtherealSuperiorBases = useCallback(
    (codes: string[]) => {
      const valid = validCodesForItems(codes, baseItemsNormalFiltered);
      if (valid.length > 0)
        setSelectedSocketedEtherealSuperiorBaseCodes(
          (prev) => new Set([...prev, ...valid]),
        );
    },
    [baseItemsNormalFiltered, validCodesForItems],
  );
  const pasteMagicBases = useCallback(
    (codes: string[]) => {
      const valid = validCodesForItems(codes, baseItemsFiltered);
      if (valid.length > 0)
        setSelectedMagicBaseCodes((prev) => new Set([...prev, ...valid]));
    },
    [baseItemsFiltered, validCodesForItems],
  );
  const pasteRareBases = useCallback(
    (codes: string[]) => {
      const valid = validCodesForItems(codes, baseItemsRareFiltered);
      if (valid.length > 0)
        setSelectedRareBaseCodes((prev) => new Set([...prev, ...valid]));
    },
    [baseItemsRareFiltered, validCodesForItems],
  );

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
    () =>
      setSelectedGemCodes(new Set(gemItemsFiltered.flatMap((i) => i.codes))),
    [gemItemsFiltered],
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
    () =>
      setSelectedPotionCodes(
        new Set(potionItemsFiltered.flatMap((i) => i.codes)),
      ),
    [potionItemsFiltered],
  );
  const clearAllPotions = useCallback(
    () => setSelectedPotionCodes(new Set()),
    [],
  );

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
    () =>
      setSelectedQuestCodes(
        new Set(questItemsFiltered.flatMap((i) => i.codes)),
      ),
    [questItemsFiltered],
  );
  const clearAllQuest = useCallback(() => setSelectedQuestCodes(new Set()), []);

  const toggleEndgame = useCallback((codes: string[]) => {
    setSelectedEndgameCodes((prev) => {
      const next = new Set(prev);
      const allSelected = codes.every((c) => next.has(c));
      if (allSelected) codes.forEach((c) => next.delete(c));
      else codes.forEach((c) => next.add(c));
      return next;
    });
  }, []);
  const selectAllEndgame = useCallback(
    () =>
      setSelectedEndgameCodes(
        new Set(endgameItemsFiltered.flatMap((i) => i.codes)),
      ),
    [endgameItemsFiltered],
  );
  const clearAllEndgame = useCallback(
    () => setSelectedEndgameCodes(new Set()),
    [],
  );

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
      setSelectedMiscOtherCodes(
        new Set(miscOtherItemsFiltered.flatMap((i) => i.codes)),
      ),
    [miscOtherItemsFiltered],
  );
  const clearAllMiscOther = useCallback(
    () => setSelectedMiscOtherCodes(new Set()),
    [],
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
  }, [miscOtherItems, selectedPotionCodes, selectedMiscOtherCodes]);

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
      Array.from(selectedNormalSuperiorBaseCodes),
      Array.from(selectedSocketedEtherealSuperiorBaseCodes),
      Array.from(selectedEndgameCodes),
      goldFilterEnabled
        ? { enabled: true, threshold: goldFilterThreshold }
        : undefined,
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
    selectedNormalSuperiorBaseCodes,
    selectedSocketedEtherealSuperiorBaseCodes,
    selectedEndgameCodes,
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
      Array.from(selectedNormalSuperiorBaseCodes),
      Array.from(selectedSocketedEtherealSuperiorBaseCodes),
      Array.from(selectedEndgameCodes),
      goldFilterEnabled
        ? { enabled: true, threshold: goldFilterThreshold }
        : undefined,
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
    selectedNormalSuperiorBaseCodes,
    selectedSocketedEtherealSuperiorBaseCodes,
    selectedEndgameCodes,
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

  const applyFilterToState = useCallback(
    (filter: LootFilter) => {
      const normal: string[] = [];
      const socketedEthereal: string[] = [];
      const normalSuperior: string[] = [];
      const socketedEtherealSuperior: string[] = [];
      const magic: string[] = [];
      const rare: string[] = [];
      const unique: string[] = [];
      const set: string[] = [];
      const runes: string[] = [];
      const gems: string[] = [];
      const potions: string[] = [];
      const quest: string[] = [];
      const endgame: string[] = [];
      const miscOther: string[] = [];
      let goldEnabled = false;
      let goldThreshold = 5000;

      // Game category (equipmentCategory) -> base codes when rule has no equipmentItemCode ("all rings", etc.)
      const GAME_CATEGORY_BASE_CODES: Record<string, string[]> = {
        rings: ["rin"],
        amule: ["amu"],
        charm: ["cm1", "cm2", "cm3"],
        jewel: ["jew", "cjw"],
      };

      // Game itemCategory -> Endgame panel codes (tokens, essences, keys, organs, etc.)
      const ITEM_CATEGORY_ENDGAME_CODES: Record<string, string[]> = {
        absol: ["tes", "ceh", "bet", "fed", "toa"], // Essence / Token of Absolution
        terrt: ["xa1", "xa2", "xa3", "xa4", "xa5"], // Terrorize Tokens (Worldstone Shards)
        uberm: [
          "pk1",
          "pk2",
          "pk3",
          "mbr",
          "dhn",
          "bey",
          "std",
          "ua1",
          "ua2",
          "ua3",
          "ua4",
          "ua5",
        ], // Keys, organs, Standard of Heroes, Ancients' items
      };

      for (const rule of filter.rules) {
        const eq = rule.equipmentItemCode;
        const ic = rule.itemCode;
        const rar = rule.equipmentRarity;
        const itemCat = rule.itemCategory;
        const eqCat = rule.equipmentCategory;

        // In-game: itemCategory ["gems"] or ["runes"] means "all gems" / "all runes" (no itemCode list)
        if (itemCat?.includes("runes")) runes.push(...runeCodeSet);
        if (itemCat?.includes("gems")) gems.push(...gemCodeSet);
        // itemCategory absol / terrt / uberm -> select all matching Endgame items
        if (itemCat?.includes("absol"))
          endgame.push(...ITEM_CATEGORY_ENDGAME_CODES.absol);
        if (itemCat?.includes("terrt"))
          endgame.push(...ITEM_CATEGORY_ENDGAME_CODES.terrt);
        if (itemCat?.includes("uberm"))
          endgame.push(...ITEM_CATEGORY_ENDGAME_CODES.uberm);

        // Category-only rule: equipmentRarity + equipmentCategory but no equipmentItemCode = "all in category"
        if (rar?.length && eqCat?.length && !eq?.length) {
          for (const cat of eqCat) {
            const codes = GAME_CATEGORY_BASE_CODES[cat];
            if (!codes) continue;
            if (rar.includes("normal") && !rule.filterEtherealSocketed)
              normal.push(...codes);
            if (rar.includes("normal") && rule.filterEtherealSocketed)
              socketedEthereal.push(...codes);
            if (rar.includes("hiQuality") && !rule.filterEtherealSocketed)
              normalSuperior.push(...codes);
            if (rar.includes("hiQuality") && rule.filterEtherealSocketed)
              socketedEtherealSuperior.push(...codes);
            if (rar.includes("magic")) magic.push(...codes);
            if (rar.includes("rare")) rare.push(...codes);
            if (rar.includes("unique")) unique.push(...codes);
            if (rar.includes("set")) set.push(...codes);
          }
        }

        if (rar?.includes("normal") && !rule.filterEtherealSocketed && eq)
          normal.push(...eq);
        else if (
          rule.filterEtherealSocketed &&
          eq &&
          (!rar?.length || rar.includes("normal"))
        )
          socketedEthereal.push(...eq);
        else if (
          rar?.includes("hiQuality") &&
          !rule.filterEtherealSocketed &&
          eq
        )
          normalSuperior.push(...eq);
        else if (
          rar?.includes("hiQuality") &&
          rule.filterEtherealSocketed &&
          eq
        )
          socketedEtherealSuperior.push(...eq);
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
              else if (endgameCodeSet.has(c)) endgame.push(c);
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
      setSelectedNormalSuperiorBaseCodes(new Set(normalSuperior));
      setSelectedSocketedEtherealSuperiorBaseCodes(
        new Set(socketedEtherealSuperior),
      );
      setSelectedMagicBaseCodes(new Set(magic));
      setSelectedRareBaseCodes(new Set(rare));
      setSelectedUniqueCodes(new Set(unique));
      setSelectedSetCodes(new Set(set));
      setSelectedRuneCodes(new Set(runes));
      setSelectedGemCodes(new Set(gems));
      setSelectedPotionCodes(new Set(potions));
      setSelectedQuestCodes(new Set(quest));
      setSelectedEndgameCodes(new Set(endgame));
      setSelectedMiscOtherCodes(new Set(miscOther));
      setGoldFilterEnabled(goldEnabled);
      setGoldFilterThreshold(goldThreshold);
    },
    [runeCodeSet, gemCodeSet, potionCodeSet, questCodeSet, endgameCodeSet],
  );

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
          applyFilterToState(filter);
        } catch (err) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load filter",
          );
        }
        e.target.value = "";
      };
      reader.onerror = () => setLoadError("Failed to read file");
      reader.readAsText(file, "utf-8");
    },
    [applyFilterToState],
  );

  const handleLoadFromPaste = useCallback(() => {
    setLoadError(null);
    const text = pasteInput.trim();
    if (!text) {
      setLoadError("Paste filter JSON first");
      return;
    }
    try {
      const filter = parseLoadedFilter(text);
      applyFilterToState(filter);
      setPasteInput("");
      setShowPastePanel(false);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Invalid filter JSON");
    }
  }, [pasteInput, applyFilterToState]);

  const totalSelected =
    selectedSetCodes.size +
    selectedUniqueCodes.size +
    selectedRuneCodes.size +
    selectedNormalBaseCodes.size +
    selectedSocketedEtherealBaseCodes.size +
    selectedNormalSuperiorBaseCodes.size +
    selectedSocketedEtherealSuperiorBaseCodes.size +
    selectedMagicBaseCodes.size +
    selectedRareBaseCodes.size +
    selectedGemCodes.size +
    selectedPotionCodes.size +
    selectedQuestCodes.size +
    selectedEndgameCodes.size +
    selectedMiscOtherCodes.size;
  const canExport =
    (totalSelected > 0 || goldFilterEnabled) && ruleCount <= MAX_RULES;

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
            Run{" "}
            <code className="bg-zinc-800 px-1 rounded">
              node copy-catalogs.mjs
            </code>{" "}
            from the <code className="bg-zinc-800 px-1 rounded">frontend</code>{" "}
            folder (after building catalogs in the repo root).
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
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
                    Game v3.1.91636 · Updated 2026-02-17
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
                    title="Load filter from file"
                    className="p-2 rounded-lg bg-zinc-600 text-white border border-zinc-500 hover:bg-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPastePanel(true);
                      setLoadError(null);
                      setPasteInput("");
                    }}
                    title="Import from paste"
                    className="p-2 rounded-lg bg-zinc-600 text-white border border-zinc-500 hover:bg-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    disabled={!canExport}
                    title="Export JSON"
                    className="p-2 rounded-lg bg-d2-unique text-zinc-900 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-d2-unique focus:ring-offset-2 focus:ring-offset-zinc-900"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyToClipboard}
                    disabled={!canExport}
                    title="Copy to clipboard — Then in game: Import from Clipboard"
                    className="p-2 rounded-lg bg-zinc-700 text-white border border-zinc-600 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                  {!showFilterDrawer && (
                    <button
                      type="button"
                      onClick={() => setShowFilterDrawer(true)}
                      aria-label="Open filters"
                      title="Open filters"
                      className="p-2 rounded-lg bg-zinc-700 text-white border border-zinc-600 hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </svg>
                    </button>
                  )}
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
                    ruleCount > MAX_RULES ? "text-amber-400" : "text-zinc-400"
                  }`}
                  title={
                    ruleCount > MAX_RULES
                      ? `Game allows max ${MAX_RULES} rules. Reduce selections to export.`
                      : undefined
                  }
                >
                  Rules: {ruleCount} / {MAX_RULES}
                </span>
                <div className="text-xs text-zinc-500 border-l border-zinc-600/80 pl-4 hidden sm:block">
                  Selected: Normal {selectedNormalBaseCodes.size} · Socketed /
                  Ethereal {selectedSocketedEtherealBaseCodes.size} · Normal
                  Superior {selectedNormalSuperiorBaseCodes.size} · Socketed /
                  Ethereal Superior{" "}
                  {selectedSocketedEtherealSuperiorBaseCodes.size} · Magic{" "}
                  {selectedMagicBaseCodes.size} · Rare{" "}
                  {selectedRareBaseCodes.size} · Unique{" "}
                  {selectedUniqueCodes.size} · Sets {selectedSetCodes.size} ·
                  Runes {selectedRuneCodes.size} · Gems {selectedGemCodes.size}{" "}
                  · Potions {selectedPotionCodes.size} · Quest{" "}
                  {selectedQuestCodes.size} · Endgame{" "}
                  {selectedEndgameCodes.size} · Misc{" "}
                  {selectedMiscOtherCodes.size}
                </div>
              </div>
            </div>
          </header>

          <div className="flex-shrink-0 px-4 md:px-6 lg:px-8 py-3 bg-zinc-900/30 border-b border-zinc-800/50 sm:hidden">
            <div className="text-xs text-zinc-500">
              Selected: Normal {selectedNormalBaseCodes.size} · Socketed /
              Ethereal {selectedSocketedEtherealBaseCodes.size} · Normal
              Superior {selectedNormalSuperiorBaseCodes.size} · Socketed /
              Ethereal Superior {selectedSocketedEtherealSuperiorBaseCodes.size}{" "}
              · Magic {selectedMagicBaseCodes.size} · Rare{" "}
              {selectedRareBaseCodes.size} · Unique {selectedUniqueCodes.size} ·
              Sets {selectedSetCodes.size} · Runes {selectedRuneCodes.size} ·
              Gems {selectedGemCodes.size} · Potions {selectedPotionCodes.size}{" "}
              · Quest {selectedQuestCodes.size} · Endgame{" "}
              {selectedEndgameCodes.size} · Misc {selectedMiscOtherCodes.size}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 md:px-6 lg:px-8 py-4">
            <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
              {showFilterDrawer && (
                <aside className="w-72 max-w-[45vw] h-full self-stretch border border-zinc-700/60 rounded-xl bg-zinc-900/50 p-4 overflow-y-auto scrollbar-thin flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-white">
                      Filters
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowFilterDrawer(false)}
                      aria-label="Close filters"
                      className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500"
                    >
                      ✕
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTierFilter(new Set());
                      setWeightFilter(new Set());
                      setSocketFilterEnabled(false);
                      setSocketFilterValue(4);
                      setCategoryFilter(new Set());
                      setWeaponHandlingFilter(new Set());
                    }}
                    className="text-xs text-zinc-500 hover:text-white focus:outline-none mb-4"
                  >
                    Reset filters
                  </button>

                  <div className="space-y-5">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-red-500 mb-2">
                        Filter By Tier
                      </p>
                      <div className="space-y-2">
                        {QUALITIES.map((quality) => (
                          <label
                            key={quality}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={tierFilter.has(quality)}
                              onChange={() => toggleTierFilter(quality)}
                              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900"
                            />
                            <span className="text-sm text-zinc-300 capitalize">
                              {quality}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-red-500 mb-2">
                        Filter By Weight
                      </p>
                      <div className="space-y-2">
                        {ARMOR_WEIGHTS.map((weight) => (
                          <label
                            key={weight}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={weightFilter.has(weight)}
                              onChange={() => toggleWeightFilter(weight)}
                              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900"
                            />
                            <span className="text-sm text-zinc-300 capitalize">
                              {weight}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-red-500 mb-2">
                        Filter By Sockets
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input
                          type="checkbox"
                          checked={socketFilterEnabled}
                          onChange={(e) =>
                            setSocketFilterEnabled(e.target.checked)
                          }
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900"
                        />
                        <span className="text-sm text-zinc-300">
                          Enable socket filter
                        </span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        step={1}
                        value={socketFilterValue}
                        onChange={(e) =>
                          setSocketFilterValue(
                            Math.max(
                              1,
                              Math.min(6, parseInt(e.target.value, 10) || 1),
                            ),
                          )
                        }
                        disabled={!socketFilterEnabled}
                        className="w-20 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-red-500 mb-2">
                        Filter By Category
                      </p>
                      <div className="space-y-2">
                        {categoryOptions.length === 0 && (
                          <p className="text-xs text-zinc-500">
                            No categories available.
                          </p>
                        )}
                        {categoryOptions.map((slot) => (
                          <label
                            key={slot}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={categoryFilter.has(slot)}
                              onChange={() => toggleCategoryFilter(slot)}
                              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900"
                            />
                            <span className="text-sm text-zinc-300">
                              {slot}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-red-500 mb-2">
                        Weapon Handling
                      </p>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={weaponHandlingFilter.has("1H")}
                            onChange={() => toggleWeaponHandlingFilter("1H")}
                            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900"
                          />
                          <span className="text-sm text-zinc-300">
                            One-Handed (1H)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={weaponHandlingFilter.has("2H")}
                            onChange={() => toggleWeaponHandlingFilter("2H")}
                            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-zinc-900"
                          />
                          <span className="text-sm text-zinc-300">
                            Two-Handed (2H)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </aside>
              )}

              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <CatalogTabs
                  tabs={[
                    {
                      id: "normal",
                      label: "Normal",
                      count: baseItemsNormalFiltered.length,
                      selectedCount: selectedNormalBaseCodes.size,
                      accentClass: "text-d2-normal",
                    },
                    {
                      id: "socketedEthereal",
                      label: "Socketed / Ethereal",
                      count: baseItemsNormalFiltered.length,
                      selectedCount: selectedSocketedEtherealBaseCodes.size,
                      accentClass: "text-d2-normal",
                    },
                    {
                      id: "normalSuperior",
                      label: "Normal Superior",
                      count: baseItemsNormalFiltered.length,
                      selectedCount: selectedNormalSuperiorBaseCodes.size,
                      accentClass: "text-d2-normal",
                    },
                    {
                      id: "socketedEtherealSuperior",
                      label: "Socketed / Ethereal Superior",
                      count: baseItemsNormalFiltered.length,
                      selectedCount:
                        selectedSocketedEtherealSuperiorBaseCodes.size,
                      accentClass: "text-d2-normal",
                    },
                    {
                      id: "magic",
                      label: "Magic",
                      count: baseItemsFiltered.length,
                      selectedCount: selectedMagicBaseCodes.size,
                      accentClass: "text-d2-magic",
                    },
                    {
                      id: "rare",
                      label: "Rare",
                      count: baseItemsRareFiltered.length,
                      selectedCount: selectedRareBaseCodes.size,
                      accentClass: "text-d2-rare",
                    },
                    {
                      id: "unique",
                      label: "Unique",
                      count: uniqueItemsFiltered.length,
                      selectedCount: selectedUniqueCodes.size,
                      accentClass: "text-d2-unique",
                    },
                    {
                      id: "sets",
                      label: "Sets",
                      count: setItemsFiltered.length,
                      selectedCount: selectedSetCodes.size,
                      accentClass: "text-d2-set",
                    },
                    {
                      id: "runes",
                      label: "Runes",
                      count: runeItemsFiltered.length,
                      selectedCount: selectedRuneCodes.size,
                      accentClass: "text-d2-crafted",
                    },
                    {
                      id: "gems",
                      label: "Gems",
                      count: gemItemsFiltered.length,
                      selectedCount: selectedGemCodes.size,
                      accentClass: "text-zinc-400",
                    },
                    {
                      id: "potions",
                      label: "Potions",
                      count: potionItemsFiltered.length,
                      selectedCount: selectedPotionCodes.size,
                      accentClass: "text-zinc-400",
                    },
                    {
                      id: "quest",
                      label: "Quest",
                      count: questItemsFiltered.length,
                      selectedCount: selectedQuestCodes.size,
                      accentClass: "text-d2-quest",
                    },
                    {
                      id: "endgame",
                      label: "Endgame",
                      count: endgameItemsFiltered.length,
                      selectedCount: selectedEndgameCodes.size,
                      accentClass: "text-d2-crafted",
                    },
                    {
                      id: "misc",
                      label: "Misc",
                      count: miscOtherItemsFiltered.length,
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
                    <CatalogSection
                      key="normal"
                      title="Normal"
                      items={baseItemsNormalFiltered}
                      selectedCodes={selectedNormalBaseCodes}
                      onToggle={toggleNormalBase}
                      onSelectAll={selectAllNormalBases}
                      onClearAll={clearAllNormalBases}
                      onPaste={pasteNormalBases}
                      accentClass="text-d2-normal"
                      itemColorClass="text-d2-normal"
                      noContainer
                      fillPanel
                      showMaxSockets
                      itemImageBasePath={`${dataBase}/item-images`}
                    />
                  )}
                  {activeTab === "socketedEthereal" && (
                    <CatalogSection
                      key="socketedEthereal"
                      title="Socketed / Ethereal"
                      items={baseItemsNormalFiltered}
                      selectedCodes={selectedSocketedEtherealBaseCodes}
                      onToggle={toggleSocketedEtherealBase}
                      onSelectAll={selectAllSocketedEtherealBases}
                      onClearAll={clearAllSocketedEtherealBases}
                      onPaste={pasteSocketedEtherealBases}
                      accentClass="text-d2-normal"
                      itemColorClass="text-d2-normal"
                      noContainer
                      fillPanel
                      showMaxSockets
                      itemImageBasePath={`${dataBase}/item-images`}
                    />
                  )}
                  {activeTab === "normalSuperior" && (
                    <CatalogSection
                      key="normalSuperior"
                      title="Normal Superior"
                      items={baseItemsNormalFiltered}
                      selectedCodes={selectedNormalSuperiorBaseCodes}
                      onToggle={toggleNormalSuperiorBase}
                      onSelectAll={selectAllNormalSuperiorBases}
                      onClearAll={clearAllNormalSuperiorBases}
                      onPaste={pasteNormalSuperiorBases}
                      accentClass="text-d2-normal"
                      itemColorClass="text-d2-normal"
                      noContainer
                      fillPanel
                      showMaxSockets
                      itemImageBasePath={`${dataBase}/item-images`}
                    />
                  )}
                  {activeTab === "socketedEtherealSuperior" && (
                    <CatalogSection
                      key="socketedEtherealSuperior"
                      title="Socketed / Ethereal Superior"
                      items={baseItemsNormalFiltered}
                      selectedCodes={selectedSocketedEtherealSuperiorBaseCodes}
                      onToggle={toggleSocketedEtherealSuperiorBase}
                      onSelectAll={selectAllSocketedEtherealSuperiorBases}
                      onClearAll={clearAllSocketedEtherealSuperiorBases}
                      onPaste={pasteSocketedEtherealSuperiorBases}
                      accentClass="text-d2-normal"
                      itemColorClass="text-d2-normal"
                      noContainer
                      fillPanel
                      showMaxSockets
                      itemImageBasePath={`${dataBase}/item-images`}
                    />
                  )}
                  {activeTab === "magic" && (
                    <CatalogSection
                      key="magic"
                      title="Magic"
                      items={baseItemsFiltered}
                      selectedCodes={selectedMagicBaseCodes}
                      onToggle={toggleMagicBase}
                      onSelectAll={selectAllMagicBases}
                      onClearAll={clearAllMagicBases}
                      onPaste={pasteMagicBases}
                      accentClass="text-d2-magic"
                      itemColorClass="text-d2-magic"
                      noContainer
                      fillPanel
                      itemImageBasePath={`${dataBase}/item-images`}
                    />
                  )}
                  {activeTab === "rare" && (
                    <CatalogSection
                      key="rare"
                      title="Rare"
                      items={baseItemsRareFiltered}
                      selectedCodes={selectedRareBaseCodes}
                      onToggle={toggleRareBase}
                      onSelectAll={selectAllRareBases}
                      onClearAll={clearAllRareBases}
                      onPaste={pasteRareBases}
                      accentClass="text-d2-rare"
                      itemColorClass="text-d2-rare"
                      noContainer
                      fillPanel
                      itemImageBasePath={`${dataBase}/item-images`}
                    />
                  )}
                  {activeTab === "unique" && (
                    <CatalogSection
                      key="unique"
                      title="Unique"
                      items={uniqueItemsFiltered}
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
                      maxrollImageBasePath={`${dataBase}/item-unique`}
                    />
                  )}
                  {activeTab === "sets" && (
                    <CatalogSection
                      key="sets"
                      title="Sets"
                      items={setItemsFiltered}
                      selectedCodes={selectedSetCodes}
                      onToggle={toggleSet}
                      onSelectAll={selectAllSet}
                      onClearAll={clearAllSet}
                      accentClass="text-d2-set"
                      itemColorClass="text-d2-set"
                      noContainer
                      fillPanel
                      itemImageBasePath={`${dataBase}/item-images`}
                      maxrollImageBasePath={`${dataBase}/item-set`}
                    />
                  )}
                  {activeTab === "runes" && (
                    <CatalogSection
                      key="runes"
                      title="Runes"
                      items={runeItemsFiltered}
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
                      key="gems"
                      title="Gems"
                      items={gemItemsFiltered}
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
                      key="potions"
                      title="Potions"
                      items={potionItemsFiltered}
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
                      key="quest"
                      title="Quest"
                      items={questItemsFiltered}
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
                  {activeTab === "endgame" && (
                    <CatalogSection
                      key="endgame"
                      title="Endgame"
                      items={endgameItemsFiltered}
                      selectedCodes={selectedEndgameCodes}
                      onToggle={toggleEndgame}
                      onSelectAll={selectAllEndgame}
                      onClearAll={clearAllEndgame}
                      accentClass="text-d2-crafted"
                      itemColorClass="text-d2-crafted"
                      noContainer
                      fillPanel
                      sortAlphabetically={false}
                      itemImageBasePath={`${dataBase}/item-images`}
                    />
                  )}
                  {activeTab === "misc" && (
                    <CatalogSection
                      key="misc"
                      title="Misc"
                      items={miscOtherItemsFiltered}
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
                        <h2 className="text-lg font-medium text-d2-gold">
                          Gold Filter
                        </h2>
                        <p className="text-sm text-zinc-400">
                          Hide small gold piles and show only gold above a
                          threshold. The game uses two rules: hide gold &lt;
                          threshold, show gold &gt; threshold.
                        </p>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={goldFilterEnabled}
                            onChange={(e) =>
                              setGoldFilterEnabled(e.target.checked)
                            }
                            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-d2-gold focus:ring-d2-gold focus:ring-offset-zinc-900"
                          />
                          <span className="text-zinc-300">
                            Enable gold filter
                          </span>
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm text-zinc-400">
                            Minimum gold to show (threshold)
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={99999999}
                            step={1000}
                            value={goldFilterThreshold}
                            onChange={(e) =>
                              setGoldFilterThreshold(
                                Math.max(0, parseInt(e.target.value, 10) || 0),
                              )
                            }
                            disabled={!goldFilterEnabled}
                            className="w-32 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-d2-gold focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </label>
                        {goldFilterEnabled && (
                          <p className="text-xs text-zinc-500">
                            Exported rules: &quot;Gold Less Than{" "}
                            {goldFilterThreshold}&quot; (hide), &quot;Gold
                            Greater Than {goldFilterThreshold}&quot; (show)
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CatalogTabs>
              </div>
            </div>
          </div>
        </div>
      </main>
      {showPastePanel && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="paste-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setShowPastePanel(false);
              setPasteInput("");
              setLoadError(null);
            }}
            aria-hidden
          />
          <div className="relative w-full max-w-lg rounded-xl bg-zinc-900 border border-zinc-600 shadow-xl p-4">
            <h2
              id="paste-dialog-title"
              className="text-lg font-semibold text-white mb-3"
            >
              Paste filter JSON
            </h2>
            <textarea
              id="paste-filter"
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder='{"name":"MyFilter","rules":[...]}'
              rows={8}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y min-h-[160px]"
            />
            {loadError && (
              <p className="mt-2 text-sm text-red-400" role="alert">
                {loadError}
              </p>
            )}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadFromPaste}
                disabled={!pasteInput.trim()}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              >
                Load
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPastePanel(false);
                  setPasteInput("");
                  setLoadError(null);
                }}
                className="px-4 py-2 rounded-lg bg-zinc-600 text-zinc-300 text-sm font-medium hover:bg-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
