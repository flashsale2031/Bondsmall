const fs = require('fs');
const text = fs.readFileSync('catalog-pages/products-page-00013.js', 'utf8');
const match = text.match(/window\.products\.push\(\.\.\.(\[.*\])\);?\s*$/s);
if (!match) {
  console.error('catalog_push_array_not_found');
  process.exit(2);
}
const products = JSON.parse(match[1]);
const found = products.filter((p) => /VEVOR.*550W.*Mattress Vacuum Cleaner|VEVOR Mattress Vacuum Cleaner/i.test(String(p.name || '')));
console.log(JSON.stringify(found, null, 2));
