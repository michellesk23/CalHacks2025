// Download product front images for given barcodes into ./images/
// Usage:
//   node scripts/download_images.js 5449000131805 3017620422003
//   cat codes.txt | xargs node scripts/download_images.js

const fs = require('fs');
const path = require('path');

const USER_AGENT = 'SnapCheck/0.1 (contact@example.com)';

function deriveFullFrom(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const m = u.pathname.match(/(front[^.]*)\.(\d{2,4})\.(jpg|png)$/i);
    if (m) {
      u.pathname = u.pathname.replace(/\.(\d{2,4})\.(jpg|png)$/i, '.full.$3');
      return u.toString();
    }
  } catch (_) {}
  return null;
}

async function urlOk(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': USER_AGENT } });
    return res.ok;
  } catch (_) {
    return false;
  }
}

async function fetchImageUrl(barcode) {
  const fields = 'image_front_url,image_url,image_ingredients_url,image_nutrition_url,selected_images';
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(fields)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json || json.status !== 1 || !json.product) return null;
  const p = json.product;
  const candidates = [];

  const display = p.selected_images && p.selected_images.front && p.selected_images.front.display && (p.selected_images.front.display.en || p.selected_images.front.display[Object.keys(p.selected_images.front.display)[0]]);
  const small = p.selected_images && p.selected_images.front && p.selected_images.front.small && (p.selected_images.front.small.en || p.selected_images.front.small[Object.keys(p.selected_images.front.small)[0]]);
  const thumb = p.selected_images && p.selected_images.front && p.selected_images.front.thumb && (p.selected_images.front.thumb.en || p.selected_images.front.thumb[Object.keys(p.selected_images.front.thumb)[0]]);

  const rawFront = p.image_front_url || p.image_url || display || small || thumb;
  const full1 = deriveFullFrom(display);
  const full2 = deriveFullFrom(rawFront);

  if (full1) candidates.push(full1);
  if (full2) candidates.push(full2);
  if (display) candidates.push(display);
  if (rawFront) candidates.push(rawFront);
  if (small) candidates.push(small);
  if (thumb) candidates.push(thumb);

  for (const c of candidates) {
    if (c && (await urlOk(c))) return c;
  }
  return null;
}

async function fetchVariantUrls(barcode) {
  const fields = 'selected_images,image_front_url,image_ingredients_url,image_nutrition_url,image_url';
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(fields)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return {};
  const json = await res.json();
  if (!json || json.status !== 1 || !json.product) return {};
  const p = json.product;
  const front = await fetchImageUrl(barcode);
  const ingDisplay = p.selected_images?.ingredients?.display?.en || p.selected_images?.ingredients?.display?.[Object.keys(p.selected_images?.ingredients?.display || {})[0]];
  const nutDisplay = p.selected_images?.nutrition?.display?.en || p.selected_images?.nutrition?.display?.[Object.keys(p.selected_images?.nutrition?.display || {})[0]];
  const ingFull = deriveFullFrom(ingDisplay) || p.image_ingredients_url;
  const nutFull = deriveFullFrom(nutDisplay) || p.image_nutrition_url;
  const ingredients = (await urlOk(ingFull)) ? ingFull : ingDisplay || null;
  const nutrition = (await urlOk(nutFull)) ? nutFull : nutDisplay || null;
  return { front, ingredients, nutrition };
}

async function downloadTo(url, destPath) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  await fs.promises.writeFile(destPath, Buffer.from(arrayBuffer));
}

async function main() {
  const barcodes = process.argv.slice(2).filter((b) => /^\d+$/.test(b));
  if (barcodes.length === 0) {
    console.error('Provide barcodes as args');
    process.exit(1);
  }
  for (const b of barcodes) {
    try {
      const { front, ingredients, nutrition } = await fetchVariantUrls(b);
      const saved = [];
      if (front) {
        const ext = path.extname(new URL(front).pathname) || '.jpg';
        const out = path.join('images', `${b}.front${ext}`);
        await downloadTo(front, out);
        saved.push(out);
      }
      if (ingredients) {
        const ext = path.extname(new URL(ingredients).pathname) || '.jpg';
        const out = path.join('images', `${b}.ingredients${ext}`);
        await downloadTo(ingredients, out);
        saved.push(out);
      }
      if (nutrition) {
        const ext = path.extname(new URL(nutrition).pathname) || '.jpg';
        const out = path.join('images', `${b}.nutrition${ext}`);
        await downloadTo(nutrition, out);
        saved.push(out);
      }
      if (saved.length === 0) console.log(`No image: ${b}`);
      else console.log(`Saved ${saved.join(', ')}`);
    } catch (e) {
      console.log(`Failed ${b}:`, e?.message || e);
    }
  }
}

main();


