const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const authorityContext = { window: { products: [{ id: 23, name: 'Original MacBook', 'retail price': 1999.99, 'pre-owned price': 299.99 }] } };
vm.createContext(authorityContext);
vm.runInContext(fs.readFileSync(path.join(root, 'catalog-authority.js'), 'utf8'), authorityContext);
const authority = authorityContext.window.BondsmallCatalogAuthority;
assert(authority && authority.count === 1, 'authority snapshot was not created');
assert(authority.get(23).name === 'Original MacBook', 'authority lookup failed');
assert(authority.protect({ id: 23, name: 'Chunk Replacement' }).name === 'Original MacBook', 'protected record was replaceable');
assert(authority.protect({ id: 99, name: 'Chunk-only Record' }).name === 'Chunk-only Record', 'missing chunk record was not allowed');

const loader = fs.readFileSync(path.join(root, 'catalog-loader.js'), 'utf8');
assert(loader.includes('preferAuthoritative'), 'loader lacks authoritative merge helper');
assert(loader.includes('authority.records'), 'loader does not reference protected records');
assert(loader.includes('getAuthoritativeRecords'), 'loader lacks authority inspection API');

for (const file of ['all.html', 'index.html', 'search-results.html', 'bondsmall.html', 'inventory.html']) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const productsIndex = html.indexOf('products.js');
  const authorityIndex = html.indexOf('catalog-authority.js');
  const loaderIndex = html.indexOf('catalog-loader.js');
  assert(productsIndex >= 0 && authorityIndex > productsIndex && loaderIndex > authorityIndex, `${file} has incorrect catalog script order`);
}

console.log(JSON.stringify({ authoritySnapshot: 'passed', protectedMergeContract: 'passed', htmlScriptOrder: 'passed', checkedPages: 5 }, null, 2));
