// barcode_lookup_example.js

// Using Node 18+ global fetch

const HEADERS = {
  "User-Agent": "SnapCheck/1.0 (team@example.com)"
};

const DEFAULT_BARCODES = [
  // A few commonly found products on Open Food Facts
//   "5449000131805", // Coca-Cola 500ml (example)
//   "3017620422003", // Nutella (example)
//   "028400040044",
  // Juice examples
  "025000040801", // Simply Orange with Mango
  "025000040825", // Simply Orange with Pineapple
];

async function lookupProduct(barcode) {
  try {
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
