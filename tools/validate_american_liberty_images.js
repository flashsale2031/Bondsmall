#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const productIds = [104, 106, 107, 108, 110, 112, 114];
const expected = new Map([
  [104, { year: 2015, front: 'assets/gold-coins/104/liberty-2015-obverse.webp', back: 'assets/gold-coins/104/liberty-2015-reverse.webp', source: 'usmint.gov' }],
  [106, { year: 2017, front: 'assets/gold-coins/106/liberty-2017-obverse.webp', back: 'assets/gold-coins/106/liberty-2017-reverse.webp', source: 'usmint.gov' }],
  [107, { year: 2018, front: 'assets/gold-coins/107/liberty-2018-obverse.webp', back: 'assets/gold-coins/107/liberty-2018-reverse.webp', source: 'apmex.com' }],
  [108, { year: 2019, front: 'assets/gold-coins/108/liberty-2019-obverse.webp', back: 'assets/gold-coins/108/liberty-2019-reverse.webp', source: 'usmint.gov' }],
  [110, { year: 2021, front: 'assets/gold-coins/110/liberty-2021-obverse.webp', back: 'assets/gold-coins/110/liberty-2021-reverse.webp', source: 'usmint.gov' }],
  [112, { year: 2023, front: 'assets/gold-coins/112/liberty-2023-obverse.webp', back: 'assets/gold-coins/112/liberty-2023-reverse.webp', source: 'usmint.gov' }],
  [114, { year: 2025, front: 'assets/gold-coins/114/liberty-2025-obverse.webp', back: 'assets/gold-coins/114/liberty-2025-reverse.webp', source: 'usmint.gov' }],
]);

const productsContext = { window: { products: [] } };
vm.runInNewContext(fs.readFileSync(path.join(root, 'products.js'), 'utf8'), productsContext, { filename: 'products.js' });
const products = productsContext.window.products;
assert.ok(Array.isArray(products), 'products.js must expose window.products');

for (const id of productIds) {
  const record = products.find((product) => Number(product.id) === id);
  const spec = expected.get(id);
  assert.ok(record, `missing product ${id}`);
  assert.equal(Number(record.photo_year), spec.year, `product ${id} year metadata`);
  assert.equal(record.photo_is_representative, false, `product ${id} must use its exact year-specific coin photo`);
  assert.equal(record.image, spec.front, `product ${id} main image must be the local obverse`);
  assert.deepEqual(Array.from(record.images || []), [spec.front, spec.back], `product ${id} gallery must use obverse and reverse`);
  assert.equal(record.photo_display, 'Obverse and reverse', `product ${id} gallery mode`);
  assert.equal(record.image_views?.front_main, 'images[0]', `product ${id} front mapping`);
  assert.equal(record.image_views?.back, 'images[1]', `product ${id} reverse mapping`);
  assert.ok(String(record.photo_source || '').includes(spec.source), `product ${id} must retain source provenance`);
  assert.ok(!/view-0[1-5]\.svg|placeholder/i.test([record.image, ...(record.images || [])].join(' ')), `product ${id} still points at a placeholder`);
  for (const imagePath of [spec.front, spec.back]) {
    const absolute = path.join(root, imagePath);
    assert.ok(fs.existsSync(absolute), `missing image asset ${imagePath}`);
    const bytes = fs.statSync(absolute).size;
    assert.ok(bytes > 10_000 && bytes < 1_000_000, `unexpected image size for ${imagePath}: ${bytes}`);
  }
}

const popup = fs.readFileSync(path.join(root, 'productpopup.js'), 'utf8');
const helperStart = popup.indexOf('window.BondsGoldCoinImages =');
const helperEnd = popup.indexOf('})();', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'gold-coin image helper must be present');
const helperContext = { window: { products } };
vm.runInNewContext(popup.slice(helperStart, helperEnd + 5), helperContext, { filename: 'productpopup.js:image-helper' });
for (const id of productIds) {
  const record = products.find((product) => Number(product.id) === id);
  const spec = expected.get(id);
  const helper = helperContext.window.BondsGoldCoinImages;
  assert.equal(helper.getPrimary(record), spec.front, `product ${id} card/detail main image selection`);
  const gallery = helper.getGallery(record);
  assert.deepEqual(Array.from(gallery.images), [spec.front, spec.back], `product ${id} modal gallery selection`);
  assert.deepEqual(Array.from(gallery.modes), ['front', 'back'], `product ${id} modal view labels`);
}

const searchResults = fs.readFileSync(path.join(root, 'search-results.js'), 'utf8');
assert.ok(searchResults.includes('if (!isGoldCoin || [104, 106, 107, 108, 110, 112, 114].includes(id)) return "";'), 'search cards must not force legacy coin placeholders for Liberty IDs');
const catalogLoader = fs.readFileSync(path.join(root, 'catalog-loader.js'), 'utf8');
assert.ok(catalogLoader.includes('if ([104, 106, 107, 108, 110, 112, 114].includes(id)) return chosen;'), 'lazy catalog hydration must preserve curated Liberty images');

const overrideContext = { window: { products: [products.find((product) => Number(product.id) === 114)] }, document: { addEventListener() {} } };
vm.runInNewContext(fs.readFileSync(path.join(root, 'product-114-fix.js'), 'utf8'), overrideContext, { filename: 'product-114-fix.js' });
const overridden2025 = overrideContext.window.products[0];
assert.equal(overridden2025.image, expected.get(114).front, '2025 override must use the official local obverse');
assert.deepEqual(Array.from(overridden2025.images), [expected.get(114).front, expected.get(114).back], '2025 override must use the official local gallery');
assert.equal(overridden2025.photo_display, 'Obverse and reverse');
assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /product-114-fix\.js\?v=20261004-american-liberty-photos-1/);

const newProductKey = 'products.js?v=20261004-american-liberty-photos-2';
const oldProductKey = 'products.js?v=20261003-liberty-images-1';
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'catalog-pages') return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : (entry.isFile() && entry.name.endsWith('.html') ? [full] : []);
  });
}
for (const htmlPath of walk(root)) {
  const text = fs.readFileSync(htmlPath, 'utf8');
  const refs = [...text.matchAll(/<script[^>]+src=["']([^"']*products\.js[^"']*)["']/g)].map((match) => match[1]);
  if (!refs.length) continue;
  assert.ok(refs.every((src) => src.includes(newProductKey)), `${path.relative(root, htmlPath)} has a stale products.js cache key`);
  assert.ok(!text.includes(oldProductKey), `${path.relative(root, htmlPath)} still contains the old cache key`);
}

console.log(`PASS: ${productIds.length} Liberty coins use verified local obverse/reverse photos; cards, modal galleries, 2025 override, and cache keys are consistent.`);
