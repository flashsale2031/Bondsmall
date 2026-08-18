const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const prechunkCommit = 'd821f4e0b0^';

function evaluateCatalog(source) {
  const context = { window: { products: [] } };
  vm.createContext(context);
  vm.runInContext(source, context, { timeout: 30000 });
  return context.window.products;
}

function historicalPart(relativePath) {
  return cp.execFileSync('git', ['show', `${prechunkCommit}:${relativePath}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

const historical = evaluateCatalog(historicalPart('catalog-parts/products-part-0001.js'))
  .filter(product => Number(product.id) >= 1 && Number(product.id) <= 159);
const historicalById = new Map(historical.map(product => [Number(product.id), product]));
const changed = [];

for (let page = 1; page <= 8; page += 1) {
  const filename = `products-page-${String(page).padStart(5, '0')}.js`;
  const absolute = path.join(root, 'catalog-pages', filename);
  const current = evaluateCatalog(fs.readFileSync(absolute, 'utf8'));
  const updated = current.map(product => {
    const id = Number(product.id);
    const original = historicalById.get(id);
    if (!original) return product;
    if (JSON.stringify(product) !== JSON.stringify(original)) changed.push(id);
    return original;
  });
  const payload = JSON.stringify(updated);
  const prefix = page === 1
    ? '// Bondsmall page-sized catalog chunk 00001\nwindow.products = window.products || [];\n'
    : '';
  fs.writeFileSync(absolute, `${prefix}window.products.push(...${payload});\n`, 'utf8');
}

console.log(JSON.stringify({ historicalCount: historical.length, changedCount: new Set(changed).size, changedIds: [...new Set(changed)].sort((a, b) => a - b) }, null, 2));
