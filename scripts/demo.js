// scripts/demo.js
// Node 18+ required (global fetch)

const USER_AGENT = "SnapCheck/0.1 (contact@example.com)"; // update email

function coerceNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function pickBrand(brands) {
  if (!brands) return null;
  const parts = brands
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts[0] : null;
}

function normalizeIngredients(ingredients) {
  if (!Array.isArray(ingredients)) return [];
  return ingredients
    .map((ing) => {
      const text = ing?.text || ing?.id || "";
      const percent = typeof ing?.percent === "number" ? ing.percent : undefined;
      return { text, percent };
    })
    .filter((ing) => ing.text.length > 0);
}

const NATURAL_SUGAR_TERMS = [
  "sugar",
  "sucrose",
  "glucose",
  "fructose",
  "dextrose",
  "honey",
  "maple syrup",
  "corn syrup",
  "high fructose corn syrup",
  "molasses",
  "agave",
];

const ARTIFICIAL_SWEETENER_TERMS = [
  "aspartame",
  "acesulfame k",
  "acesulfame-k",
  "acesulfame potassium",
  "sucralose",
  "saccharin",
  "stevia",
  "rebaudioside",
  "monk fruit",
  "erythritol",
  "xylitol",
  "sorbitol",
  "neotame",
  "advantame",
];

function detectSweeteners(ingredientsText) {
  const text = (ingredientsText || "").toLowerCase();
  const naturalTerms = NATURAL_SUGAR_TERMS.filter((t) => text.includes(t));
  const artificialTerms = ARTIFICIAL_SWEETENER_TERMS.filter((t) => text.includes(t));
  return {
    hasNaturalSugar: naturalTerms.length > 0,
    hasArtificialSweetener: artificialTerms.length > 0,
    naturalTerms,
    artificialTerms,
  };
}

function normalizeOffProduct(resp) {
  if (!resp || resp.status !== 1 || !resp.product || !resp.product.code) return null;
  const p = resp.product;
  const nutriments = p.nutriments || {};

  const energyKcal =
    coerceNumber(nutriments["energy-kcal_100g"]) ??
    coerceNumber(nutriments["energy-kcal_value"]) ??
    coerceNumber(nutriments["energy-kcal"]) ??
    undefined;

  return {
    barcode: p.code,
    name: p.product_name ?? null,
    brand: pickBrand(p.brands),
    categories: Array.isArray(p.categories_tags) ? p.categories_tags : [],
    ingredientsText: p.ingredients_text ?? null,
    ingredients: normalizeIngredients(p.ingredients),
    nutrients: {
      sugars_100g: coerceNumber(nutriments["sugars_100g"]) ?? undefined,
      energy_kcal_100g: energyKcal,
      sodium_100g: coerceNumber(nutriments["sodium_100g"]) ?? undefined,
      carbohydrates_100g: coerceNumber(nutriments["carbohydrates_100g"]) ?? undefined,
      proteins_100g: coerceNumber(nutriments["proteins_100g"]) ?? undefined,
      fat_100g: coerceNumber(nutriments["fat_100g"]) ?? undefined,
    },
    juicePercent: null, // delegated
    sweeteners: detectSweeteners(p.ingredients_text || null),
  };
}

async function getEligibilityInput(barcode) {
  const fields = [
    "code",
    "product_name",
    "brands",
    "ingredients_text",
    "ingredients",
    "categories_tags",
    "nutriments",
  ].join(",");
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(fields)}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return { ok: false, reason: "http_error", status: res.status };
  const json = await res.json();
  if (!json || json.status !== 1) return { ok: false, reason: "not_found" };
  const normalized = normalizeOffProduct(json);
  if (!normalized) return { ok: false, reason: "invalid_response" };
  return { ok: true, data: normalized };
}

async function run(barcodes) {
  for (const b of barcodes) {
    try {
      const res = await getEligibilityInput(b);
      if (res.ok) {
        const p = res.data;
        console.log("✅ Product Found:");
        console.log("Barcode:", p.barcode);
        console.log("Name:", p.name);
        console.log("Categories:", p.categories);
        console.log("Ingredients:", p.ingredientsText);
        console.log("Sugar (g per 100g):", p.nutrients.sugars_100g);
      } else {
        console.log("❌ Product not found:", b);
      }
    } catch (e) {
      console.log("❌ Error: ", b, e?.message || e);
    }
    console.log("-");
  }
}

const cli = process.argv.slice(2).filter((b) => /^\d+$/.test(b));
const defaults = [
  "5449000131805",
  "3017620422003",
  "3228857000850",
  "025000040801",
  "025000040825",
];

run(cli.length ? cli : defaults);


