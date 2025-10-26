import { getEligibilityInput } from "../mobile/src/data";

async function test(barcodes: string[]) {
  for (const b of barcodes) {
    const res = await getEligibilityInput(b);
    if (res.ok) {
      const p = res.data;
      console.log("✅ Product Found:");
      console.log("Barcode:", p.barcode);
      console.log("Name:", p.name);
      console.log("Categories:", p.categories);
      console.log("Ingredients:", p.ingredientsText);
      console.log("Sugar (g per 100g):", p.nutrients.sugars_100g);
      console.log("Juice %:", p.juicePercent ?? "Unknown");
    } else {
      console.log("❌ Product not found:", b);
    }
    console.log("-");
  }
}

const cli = process.argv.slice(2).filter((b) => /^\d+$/.test(b));
const defaults = [
  "5449000131805", // Coca-Cola 500ml
  "3017620422003", // Nutella
  "3228857000850", // Not found example maybe
  "025000040801", // Simply Orange with Mango
  "025000040825", // Simply Orange with Pineapple
];

test(cli.length ? cli : defaults);


