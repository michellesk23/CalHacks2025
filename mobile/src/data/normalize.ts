import {
  EligibilityInput,
  NormalizedIngredient,
  OffProduct,
  OffProductResponse,
} from "../types/product";

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function pickBrand(brands?: string): string | null {
  if (!brands) return null;
  const parts = brands
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts[0] : null;
}

function normalizeIngredients(ingredients?: OffProduct["ingredients"]): NormalizedIngredient[] {
  if (!ingredients || !Array.isArray(ingredients)) return [];
  return ingredients
    .map((ing) => {
      const text = ing.text || ing.id || "";
      const percent =
        typeof ing.percent === "number"
          ? ing.percent
          : typeof (ing as any).percent_estimate === "number"
          ? (ing as any).percent_estimate
          : typeof (ing as any).percent_max === "number"
          ? (ing as any).percent_max
          : typeof (ing as any).percent_min === "number"
          ? (ing as any).percent_min
          : undefined;
      return { text, percent } as NormalizedIngredient;
    })
    .filter((ing) => ing.text.length > 0);
}

function extractJuicePercent(_off: OffProduct): number | null {
  // Delegated to external eligibility module; intentionally not inferred here
  return null;
}


export function normalizeOffProduct(resp: OffProductResponse): EligibilityInput | null {
  if (!resp || resp.status !== 1 || !resp.product || !resp.product.code) return null;
  const p = resp.product;
  const nutriments = p.nutriments || {};

  const energyKcal =
    coerceNumber((nutriments as any)["energy-kcal_100g"]) ??
    coerceNumber((nutriments as any)["energy-kcal_value"]) ??
    coerceNumber((nutriments as any)["energy-kcal"]) ??
    undefined;

  return {
    barcode: p.code,
    name: p.product_name ?? null,
    brand: pickBrand(p.brands),
    categories: Array.isArray(p.categories_tags) ? p.categories_tags : [],
    ingredientsText: p.ingredients_text ?? null,
    ingredients: normalizeIngredients(p.ingredients),
    nutrients: {
      sugars_100g: coerceNumber((nutriments as any)["sugars_100g"]) ?? undefined,
      energy_kcal_100g: energyKcal,
      sodium_100g: coerceNumber((nutriments as any)["sodium_100g"]) ?? undefined,
      carbohydrates_100g: coerceNumber((nutriments as any)["carbohydrates_100g"]) ?? undefined,
      proteins_100g: coerceNumber((nutriments as any)["proteins_100g"]) ?? undefined,
      fat_100g: coerceNumber((nutriments as any)["fat_100g"]) ?? undefined,
    },
    juicePercent: extractJuicePercent(p),
  };
}


