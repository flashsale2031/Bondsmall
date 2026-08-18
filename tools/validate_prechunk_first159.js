const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
function evalCatalog(source) { const context = { window: { products: [] } }; vm.createContext(context); vm.runInContext(source, context, { timeout: 30000 }); return context.window.products; }
function oldPart(n) { return cp.execFileSync('git', ['show', `d821f4e0b0^:catalog-parts/products-part-${String(n).padStart(4,'0')}.js`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
const old = new Map(evalCatalog(oldPart(1)).filter(p => Number(p.id) <= 159).map(p => [Number(p.id), p]));
const current = new Map();
for (let n = 1; n <= 8; n++) { const file = path.join(root, 'catalog-pages', `products-page-${String(n).padStart(5,'0')}.js`); for (const p of evalCatalog(fs.readFileSync(file, 'utf8'))) if (Number(p.id) <= 159) current.set(Number(p.id), p); }
const mismatches = [...new Set([...old.keys(), ...current.keys()])].filter(id => JSON.stringify(old.get(id)) !== JSON.stringify(current.get(id)));
const mac = current.get(23);
console.log(JSON.stringify({ oldCount: old.size, currentCount: current.size, mismatches, macbook: { name: mac?.name, retailPrice: mac?.['retail price'], salePrice: mac?.['sale price'], preOwnedPrice: mac?.['pre-owned price'] } }, null, 2));
if (mismatches.length) process.exit(1);
