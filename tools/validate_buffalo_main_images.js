#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = { window: { products: [] } };
vm.runInNewContext(fs.readFileSync(path.join(root, 'products.js'), 'utf8'), context);

const expected = new Map([
  [122, { name: '2008 American Buffalo One Ounce Gold Coin', image: 'assets/main-images/2008-american-buffalo-obverse.jpg' }],
  [123, { name: '2009 American Buffalo One Ounce Gold Coin', image: 'assets/main-images/2009-american-buffalo-obverse.jpg' }],
]);

for (const [id, spec] of expected) {
  const product = context.window.products.find((entry) => entry && Number(entry.id) === id);
  if (!product) throw new Error(`Missing product ${id}`);
  if (product.name !== spec.name) throw new Error(`Unexpected product name for ${id}: ${product.name}`);
  if (product.image !== spec.image) throw new Error(`Incorrect main image for ${id}: ${product.image}`);
  if (!Array.isArray(product.images) || product.images[0] !== spec.image) {
    throw new Error(`Gallery's first image does not match the main image for ${id}`);
  }
  if (!product.image_views || product.image_views.front_main !== spec.image) {
    throw new Error(`front_main does not match the main image for ${id}`);
  }
  const assetPath = path.join(root, spec.image);
  const bytes = fs.readFileSync(assetPath);
  if (bytes.length < 50_000 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
    throw new Error(`Missing or invalid JPEG asset for product ${id}: ${assetPath}`);
  }
  console.log(`OK ${id}: ${product.name} -> ${spec.image} (${bytes.length} bytes)`);
}
