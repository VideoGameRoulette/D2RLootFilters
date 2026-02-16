#!/usr/bin/env node
/**
 * Build a Set-items catalog for a D2R loot-filter builder.
 *
 * Sources:
 * - Set lists + set-piece base item names: https://diablo2.io/sets/   (Full Set blocks)   (text includes "Item • Base")
 * - Base item code + type/slot mapping: https://raw.githubusercontent.com/blizzhackers/d2data/master/json/{armor,weapons,misc}.json
 *
 * Output: JSON array of entries (headers + set-wide toggles + per-piece toggles).
 *
 * Usage:
 *   node build-sets-catalog.mjs > catalog.sets.json
 *   node build-sets-catalog.mjs catalog.sets.json
 */

import fs from "node:fs/promises";
import process from "node:process";

// Minimal dependency to parse HTML reliably
//   npm i cheerio
import * as cheerio from "cheerio";

const URL_SETS_PAGE = "https://diablo2.io/sets/";
const URL_ARMOR = "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/armor.json";
const URL_WEAPONS = "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/weapons.json";
const URL_MISC = "https://raw.githubusercontent.com/blizzhackers/d2data/master/json/misc.json";

const MAX_LABEL = 32;

// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function clean(s) {
    return (s ?? "")
        .replace(/\s+/g, " ")
        .replace(/\u00a0/g, " ")
        .trim();
}

function normalizeNameKey(s) {
    return clean(s).toLowerCase();
}

function splitItemAndBase(text) {
    // diablo2.io uses a mid-dot/bullet between set item name and base item name in the "Full Set" line.
    const parts = clean(text).split(/•|·|&bull;|&#8226;|\u2022|\u00b7/).map(clean);
    if (parts.length < 2) return null;
    return { itemName: parts[0], baseName: parts[1] };
}

function setAcronym(setName) {
    // Simple acronym: first letters of words, ignoring small words
    const stop = new Set(["of", "the", "and", "a", "an"]);
    const words = clean(setName)
        .replace(/[^a-zA-Z0-9'\s-]/g, " ")
        .split(/\s+/)
        .filter(Boolean);

    const letters = words
        .filter((w) => !stop.has(w.toLowerCase()))
        .map((w) => w[0]?.toUpperCase())
        .filter(Boolean);

    return letters.slice(0, 4).join("") || setName.slice(0, 2).toUpperCase();
}

function slotFromType(source, type) {
    const t = (type ?? "").toLowerCase();

    if (source === "weapons") return "Weapon";

    // misc
    if (t === "ring") return "Ring";
    if (t === "amul" || t === "amulet") return "Amulet";
    if (t === "char" || t === "charm") return "Charm";

    // armor-ish
    if (t === "belt") return "Belt";
    if (t === "boot") return "Boots";
    if (t === "glov") return "Gloves";
    if (t === "tors") return "Armor";

    // helms: normal helms + class helms/circlets/pelts
    if (t === "helm" || t === "circ" || t === "pelt" || t === "phlm") return "Helm";

    // shields + class shields (necro heads etc.)
    if (t === "shie" || t === "ashd" || t === "shld" || t === "pash" || t === "head")
        return "Shield";

    // fallback: if it came from armor.json but isn't any of the above, treat as Armor
    if (source === "armor") return "Armor";

    return "Other";
}

function slotAbbr(slot) {
    switch (slot) {
        case "Weapon":
            return "Weap";
        case "Gloves":
            return "Glov";
        case "Boots":
            return "Boot";
        case "Shield":
            return "Shld";
        default:
            return slot;
    }
}

/** Label without slot tag (slot shown separately in UI) */
function shortenLabel(setName, itemName) {
    let label = clean(itemName);

    if (label.length <= MAX_LABEL) return label;

    // If too long, compress the set prefix: "Immortal King's Soul Cage" -> "IK Soul Cage"
    const acr = setAcronym(setName);
    let core = itemName;
    const idx = itemName.indexOf("'s ");
    if (idx >= 0) core = itemName.slice(idx + 3);
    core = clean(core);

    label = `${acr} ${core}`.trim();
    if (label.length <= MAX_LABEL) return label;

    return label.slice(0, MAX_LABEL);
}

function dedupeBy(arr, keyFn) {
    const seen = new Set();
    const out = [];
    for (const x of arr) {
        const k = keyFn(x);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(x);
    }
    return out;
}

// ---------- scraping + mapping ----------
async function fetchJson(url) {
    const res = await fetch(url, { headers: { "user-agent": "VGRoulette-catalog-builder/1.0" } });
    if (!res.ok) throw new Error(`Failed ${url}: ${res.status} ${res.statusText}`);
    return res.json();
}

async function fetchText(url) {
    const res = await fetch(url, { headers: { "user-agent": "VGRoulette-catalog-builder/1.0" } });
    if (!res.ok) throw new Error(`Failed ${url}: ${res.status} ${res.statusText}`);
    return res.text();
}

/** Aliases for base names (diablo2.io uses short names; d2data uses full names) */
const BASE_NAME_ALIASES = {
    "hard leather": "Hard Leather Armor",
    "kris": "Kriss",
};

function buildBaseNameIndex({ armor, weapons, misc }) {
    // Map base item "name" -> { code, type, source }
    // Prefer exact matches; keep first seen to reduce surprises.
    const idx = new Map();

    const add = (source, objMap) => {
        for (const [code, row] of Object.entries(objMap)) {
            const name = row?.name;
            if (!name) continue;

            const k = normalizeNameKey(name);
            if (!idx.has(k)) {
                idx.set(k, {
                    code,
                    type: row?.type ?? null,
                    source,
                    name: name,
                });
            }
        }
    };

    add("armor", armor);
    add("weapons", weapons);
    add("misc", misc);

    // Add aliases so scraped base names resolve (e.g. "Hard Leather" -> "Hard Leather Armor")
    for (const [alias, canonical] of Object.entries(BASE_NAME_ALIASES)) {
        const k = normalizeNameKey(alias);
        const canonicalEntry = idx.get(normalizeNameKey(canonical));
        if (canonicalEntry && !idx.has(k)) {
            idx.set(k, canonicalEntry);
        }
    }

    return idx;
}

function extractFullSetsFromHtml(html) {
    const $ = cheerio.load(html);

    const sets = [];

    // Strategy:
    // - diablo2.io renders set blocks with a visible set name heading and a "Full Set" section
    // - items in the "Full Set" line(s) are links whose text includes "•" (Item • Base)
    //
    // We scan headings and pick those that have nearby "Full Set" and bullet-linked items.
    $("h3, h2").each((_, h) => {
        const setName = clean($(h).text());
        if (!setName) return;

        const sibs = $(h).nextUntil("h3, h2");
        const sibText = clean(sibs.text());
        if (!/Full Set/i.test(sibText)) return;

        // collect "Item • Base" anchors within this block
        const anchors = sibs
            .find("a")
            .toArray()
            .map((a) => clean($(a).text()))
            .filter((t) => /•|·|\u2022|\u00b7/.test(t));

        const items = anchors
            .map(splitItemAndBase)
            .filter(Boolean);

        if (!items.length) return;

        sets.push({
            setName,
            items: dedupeBy(items, (x) => `${x.itemName}||${x.baseName}`),
        });
    });

    // If the markup changes and we didn't find sets, fail loudly.
    if (!sets.length) {
        throw new Error(
            "Could not find any Full Set blocks. diablo2.io markup likely changed; update selectors in extractFullSetsFromHtml()."
        );
    }

    // Dedupe sets by name (page may have repeated headings in some layouts)
    return dedupeBy(sets, (s) => s.setName);
}

function buildCatalogEntries(sets, baseIdx) {
    const entries = [];
    const missing = [];

    for (const set of sets) {
        const setName = set.setName;
        const setShort = setAcronym(setName);

        // "category header" entry (builder can turn this into a no-filter show rule header)
        entries.push({
            kind: "header",
            label: setName,
            enabled: false,
        });

        // Per-piece toggles (no grouped "whole set" entry)
        for (const it of set.items) {
            const baseKey = normalizeNameKey(it.baseName);
            const base = baseIdx.get(baseKey);

            if (!base) {
                missing.push({ setName, itemName: it.itemName, baseName: it.baseName });
                continue;
            }

            const slot = slotFromType(base.source, base.type);
            const label = shortenLabel(setName, it.itemName);

            entries.push({
                rarity: "set",
                label,
                code: base.code,
                enabled: false,
                slot,
                baseName: base.name,     // helpful metadata
                baseType: base.type,     // helpful metadata
                source: base.source,     // helpful metadata
            });
        }
    }

    return { entries, missing };
}

// ---------- main ----------
async function main() {
    const outPath = process.argv[2] || null;

    // 1) Fetch D2 base item data (codes + types)
    const [armor, weapons, misc] = await Promise.all([
        fetchJson(URL_ARMOR),
        fetchJson(URL_WEAPONS),
        fetchJson(URL_MISC),
    ]);

    const baseIdx = buildBaseNameIndex({ armor, weapons, misc });

    // 2) Fetch diablo2.io sets page and extract Full Set blocks + pieces
    const html = await fetchText(URL_SETS_PAGE);
    const sets = extractFullSetsFromHtml(html);

    // 3) Build entries
    const { entries, missing } = buildCatalogEntries(sets, baseIdx);

    // 4) Emit
    const payload = {
        name: "Set Catalog",
        generatedAt: new Date().toISOString(),
        source: {
            setsPage: URL_SETS_PAGE,
            d2data: [URL_ARMOR, URL_WEAPONS, URL_MISC],
        },
        entries,
        missing, // base names that didn’t map to a code (should be near-empty)
    };

    const json = JSON.stringify(payload, null, 2);

    if (outPath) {
        await fs.writeFile(outPath, json, "utf8");
    } else {
        process.stdout.write(json);
    }

    // helpful stderr summary
    console.error(
        `\nDone. Sets found: ${sets.length}. Entries: ${entries.length}. Missing mappings: ${missing.length}\n`
    );

    if (missing.length) {
        console.error("Missing base-item mappings (first 20):");
        for (const m of missing.slice(0, 20)) {
            console.error(`- [${m.setName}] ${m.itemName} -> base "${m.baseName}"`);
        }
    }
}

main().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
});
