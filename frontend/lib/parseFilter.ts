import type { FilterRule, LootFilter } from "./types";

/**
 * Parse and validate a JSON string as a LootFilter.
 * Ensures shape { name: string, rules: array } and sanitizes rules.
 * @throws Error if JSON is invalid or structure is wrong
 */
export function parseLoadedFilter(jsonString: string): LootFilter {
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    const message = e instanceof SyntaxError ? e.message : "Invalid JSON";
    throw new Error(`Invalid JSON: ${message}`);
  }

  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Filter must be an object with 'name' and 'rules'");
  }

  const obj = data as Record<string, unknown>;
  const name = obj.name;
  const rules = obj.rules;

  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("Filter must have a non-empty 'name' string");
  }
  if (!Array.isArray(rules)) {
    throw new Error("Filter must have a 'rules' array");
  }

  const sanitizedRules: FilterRule[] = [];
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (r == null || typeof r !== "object" || Array.isArray(r)) continue;
    const rule = r as Record<string, unknown>;
    if (
      typeof rule.name !== "string" ||
      typeof rule.enabled !== "boolean" ||
      typeof rule.ruleType !== "string" ||
      typeof rule.filterEtherealSocketed !== "boolean"
    ) {
      continue;
    }
    if (rule.ruleType !== "hide" && rule.ruleType !== "show") continue;

    const sanitized: FilterRule = {
      name: String(rule.name),
      enabled: Boolean(rule.enabled),
      ruleType: rule.ruleType as "hide" | "show",
      filterEtherealSocketed: Boolean(rule.filterEtherealSocketed),
    };
    if (Array.isArray(rule.equipmentRarity)) {
      sanitized.equipmentRarity = rule.equipmentRarity.filter(
        (x): x is string => typeof x === "string"
      );
    }
    if (Array.isArray(rule.equipmentCategory)) {
      sanitized.equipmentCategory = rule.equipmentCategory.filter(
        (x): x is string => typeof x === "string"
      );
    }
    if (Array.isArray(rule.equipmentItemCode)) {
      sanitized.equipmentItemCode = rule.equipmentItemCode.filter(
        (x): x is string => typeof x === "string"
      );
    }
    if (Array.isArray(rule.itemCode)) {
      sanitized.itemCode = rule.itemCode.filter(
        (x): x is string => typeof x === "string"
      );
    }
    if (Array.isArray(rule.itemCategory)) {
      sanitized.itemCategory = rule.itemCategory.filter(
        (x): x is string => typeof x === "string"
      );
    }
    if (
      typeof rule.goldFilterValue === "number" &&
      Number.isFinite(rule.goldFilterValue)
    ) {
      sanitized.goldFilterValue = Math.max(0, Math.floor(rule.goldFilterValue));
    }
    sanitizedRules.push(sanitized);
  }

  return {
    name: name.trim().slice(0, 32),
    rules: sanitizedRules,
  };
}
