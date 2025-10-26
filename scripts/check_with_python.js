// Pipe our normalized JSON into the Python eligibility checker and print the result.
// Usage:
//   FDC_API_KEY=... node scripts/check_with_python.js <barcode>

const { spawn } = require('child_process');

const USER_AGENT = 'SnapCheck/0.1 (contact@example.com)';
const FDC_API_KEY = process.env.FDC_API_KEY;

async function fetchOff(barcode) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,ingredients_text,categories_tags,nutriments`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json || json.status !== 1) return null;
  return json.product;
}

async function fetchFdc(barcode) {
  if (!FDC_API_KEY) return null;
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${FDC_API_KEY}&query=${encodeURIComponent(barcode)}&dataType=Branded&pageSize=1`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  const json = await res.json();
  const f = json && Array.isArray(json.foods) ? json.foods[0] : null;
  return f || null;
}

function toPythonInput(p) {
  // Map to the minimal structure expected by check_eligibility()
  return {
    name: p.product_name || '',
    categories: Array.isArray(p.categories_tags) ? p.categories_tags : [],
    ingredients: p.ingredients_text || '',
    nutrients: {},
    source: 'off',
    source_meta: {
      provider: 'off'
    }
  };
}

function toPythonInputFromFdc(f) {
  return {
    name: [f?.brandOwner, f?.description].filter(Boolean).join(' ') || '',
    categories: [],
    ingredients: f?.ingredients || '',
    nutrients: {},
    source: 'fdc',
    source_meta: {
      provider: 'fdc',
      dataType: f?.dataType,
      brandOwner: f?.brandOwner,
      fdcId: f?.fdcId,
      gtinUpc: f?.gtinUpc
    }
  };
}

async function main() {
  const barcode = process.argv[2];
  if (!barcode) {
    console.error('Usage: node scripts/check_with_python.js <barcode>');
    process.exit(1);
  }
  try {
    let input = null;
    // Prefer OFF first
    const off = await fetchOff(barcode);
    if (off) {
      input = toPythonInput(off);
    }
    // Fallback to FDC if OFF missing and API key provided
    if (!input) {
      try {
        const fdc = await fetchFdc(barcode);
        if (fdc) input = toPythonInputFromFdc(fdc);
      } catch (_) {}
    }
    if (!input) {
      console.error('❌ Product not found:', barcode);
      process.exit(1);
    }
    const py = spawn('python3', ['eligibility/run_check.py'], { stdio: ['pipe', 'inherit', 'inherit'] });
    py.stdin.write(JSON.stringify(input));
    py.stdin.end();
  } catch (e) {
    console.error('Error:', e.message || e);
    process.exit(1);
  }
}

main();


