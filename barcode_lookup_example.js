// barcode_lookup_example.js

// Using Node 18+ global fetch

const HEADERS = {
  "User-Agent": "SnapCheck/1.0 (team@example.com)"
};

const FDC_API_KEY = process.env.FDC_API_KEY;

const DEFAULT_BARCODES = [
  // A few commonly found products on Open Food Facts
  "5449000131805", // Coca-Cola 500ml (example)
  "3017620422003", // Nutella (example)
  "028400040044",
  // Juice examples
  "025000040801", // Simply Orange with Mango
  "025000040825", // Simply Orange with Pineapple
];

async function lookupProduct(barcode) {
  try {
    // Prefer FDC (Branded) when API key is available
    if (FDC_API_KEY) {
      const fdcUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${FDC_API_KEY}&query=${encodeURIComponent(
        barcode
      )}&dataType=Branded&pageSize=1`;
      const fdcRes = await fetch(fdcUrl, { headers: { "User-Agent": HEADERS["User-Agent"] } });
      if (fdcRes.ok) {
        const fdcData = await fdcRes.json();
        const f = fdcData?.foods?.[0];
        if (f) {
          console.log("✅ Product Found (FDC):");
          console.log("Barcode:", f.gtinUpc || barcode);
          console.log("Name:", f.description);
          console.log("Brands:", f.brandOwner || f.brandName || "");
          console.log("Ingredients:", f.ingredients || "");
          console.log("Sugar (label):", f.labelNutrients?.sugars?.value);
          return;
        }
      }
    }

    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}`;
    const res = await fetch(url, { headers: HEADERS });
    const data = await res.json();

    if (data.status === 0) {
      console.log(`❌ Product not found: ${barcode}`);
      return;
    }

    const product = data.product;
    console.log("✅ Product Found:");
    console.log("Barcode:", barcode);
    console.log("Name:", product.product_name);
    console.log("Brands:", product.brands || (product.brands_tags || []).join(", "));
    console.log("Categories:", product.categories_tags);
    console.log("Ingredients:", product.ingredients_text);
    console.log("Sugar (g):", product.nutriments?.sugars);
  } catch (err) {
    console.error(`Error fetching product for ${barcode}:`, err);
  }
}

async function main() {
  const cliBarcodes = process.argv.slice(2).filter(b => /^\d+$/.test(b));
  const barcodesToQuery = cliBarcodes.length > 0 ? cliBarcodes : DEFAULT_BARCODES;

  for (const barcode of barcodesToQuery) {
    await lookupProduct(barcode);
    if (barcode !== barcodesToQuery[barcodesToQuery.length - 1]) {
      console.log("-");
    }
  }
}

main();
