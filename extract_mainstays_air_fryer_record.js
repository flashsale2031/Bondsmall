const fs = require('fs');
const candidates = ['catalog-pages/products-page-00013.js','catalog-pages/products-page-09191.js'];
for (const file of candidates) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/window\.products\.push\(\.\.\.(\[.*\])\);?\s*$/s);
  if (!match) continue;
  const products = JSON.parse(match[1]);
  const found = products.filter((p) => /Mainstays 8-Qt Air Fryer/i.test(String(p.name || '')));
  if (found.length) console.log(JSON.stringify({file, products: found}, null, 2));
}
