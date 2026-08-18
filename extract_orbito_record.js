const fs = require('fs');
const candidates = ['catalog-pages/products-page-40717.js', 'catalog-pages/products-page-00012.js'];
for (const file of candidates) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/window\.products\.push\(\.\.\.(\[.*\])\);?\s*$/s);
  if (!match) continue;
  const products = JSON.parse(match[1]);
  const found = products.filter((p) => /Orbito Strategy Board Game/i.test(String(p.name || '')));
  if (found.length) {
    console.log(JSON.stringify({file, products: found}, null, 2));
  }
}
