const fs = require('fs');
const files = ['catalog-pages/products-page-00015.js', 'catalog-pages/products-page-00017.js'];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/window\.products\.push\(\.\.\.(\[.*\])\);?\s*$/s);
  if (!match) continue;
  const products = JSON.parse(match[1]);
  const found = products.filter((p) => /Donatello Gian/i.test(String(p.name || '')));
  if (found.length) console.log(JSON.stringify({file, products: found}, null, 2));
}
