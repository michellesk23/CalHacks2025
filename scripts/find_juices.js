// Find fruit juice products on Open Food Facts by category.
// Usage examples:
//   node scripts/find_juices.js                # print 50 codes+names (pages=3)
//   node scripts/find_juices.js --codes        # print codes only
//   node scripts/find_juices.js --pages 5 --limit 120
//
// Requires Node 18+ (global fetch)

const DEFAULT_CATEGORIES = [
  "en:fruit-juices",
  "en:juices-and-nectars",
  "en:fruit-nectars",
  "en:orange-juices",
  "en:apple-juices",
  "en:grape-juices",
  "en:pineapple-juices",
  "en:multifruit-juices",
  "en:berry-juices",
  "en:cranberry-juices",
];

function looksLikePercent(text) {
  if (!text) return false;
  return /(\d{1,3})\s?%\s?(?:fruit\s+)?(?:orange|apple|grape|pineapple|mango|cranberry|mixed|blend|multi|juice)/i.test(
    text
  );
}

async function fetchCategoryPage(category, page) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=true&fields=code,product_name,ingredients_text,categories_tags&tagtype_0=categories&tag_contains_0=contains&tag_0=${encodeURIComponent(
    category
  )}&page_size=100&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const args = process.argv.slice(2);
  const pagesIdx = args.indexOf("--pages");
  const limitIdx = args.indexOf("--limit");
  const pages = pagesIdx >= 0 ? parseInt(args[pagesIdx + 1] || "3", 10) : 3;
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1] || "50", 10) : 50;
  const codesOnly = args.includes("--codes");
  const requirePercent = false; // percent detection delegated to partner; always false

  const results = new Map(); // code -> name
  for (const cat of DEFAULT_CATEGORIES) {
    for (let p = 1; p <= pages; p++) {
      try {
        const data = await fetchCategoryPage(cat, p);
        for (const prod of data.products || []) {
          if (!prod || !prod.code) continue;
          const hay = `${prod.ingredients_text || ""} ${prod.product_name || ""}`;
          if (requirePercent && !looksLikePercent(hay)) continue; // currently disabled
          if (!results.has(prod.code)) results.set(prod.code, prod.product_name || "");
          if (results.size >= limit) break;
        }
      } catch (e) {
        // ignore page errors
      }
      if (results.size >= limit) break;
    }
    if (results.size >= limit) break;
  }

  for (const [code, name] of results) {
    if (codesOnly) console.log(code);
    else console.log(`${code}\t${name}`);
  }
}

main();


