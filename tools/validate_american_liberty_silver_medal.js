#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = { window: { products: [] } };
vm.runInNewContext(fs.readFileSync(path.join(root, 'products.js'), 'utf8'), context, { filename: 'products.js' });
const product = context.window.products.find((item) => Number(item.id) === 111);
assert.ok(product, 'product 111 must exist');
assert.equal(product.name, '2022 American Liberty Silver Medal');
assert.equal(product.image, 'assets/medals/2022-american-liberty-silver/obverse.webp');
assert.deepEqual(Array.from(product.images), [
  'assets/medals/2022-american-liberty-silver/obverse.webp',
  'assets/medals/2022-american-liberty-silver/reverse-and-packaging.webp',
  'assets/medals/2022-american-liberty-silver/presentation-case.webp',
  'assets/medals/2022-american-liberty-silver/packaging-detail.webp',
]);
assert.equal(product.photo_year, 2022);
assert.equal(product.photo_is_representative, false);
assert.ok(product.source.includes('usmint.gov'));
for (const relativePath of product.images) {
  const absolutePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(absolutePath), `missing local gallery asset: ${relativePath}`);
  assert.ok(fs.statSync(absolutePath).size > 10_000, `gallery asset is unexpectedly small: ${relativePath}`);
  assert.match(relativePath, /^assets\//);
}
assert.ok(!product.images.some((image) => /^https?:\/\//i.test(image)), 'gallery must not depend on external hotlinks');
assert.ok(!product.images.some((image) => /generated|placeholder/i.test(image)), 'gallery must not use generated placeholders');
console.log('PASS: product 111 uses four unique local 2022 medal photos with no external or placeholder gallery references.');
