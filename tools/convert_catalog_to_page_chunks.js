const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repo = path.resolve(__dirname, '..');
const sourceDir = path.join(repo, 'catalog-parts');
const outputDir = path.join(repo, 'catalog-pages');
const PAGE_SIZE = 20;
const expectedParts = 1232;

fs.mkdirSync(outputDir, { recursive: true });

const existingPages = fs.readdirSync(outputDir)
  .filter((name) => /^products-page-\d+\.js$/.test(name))
  .sort();
let pageRecords = [];
let pageNumber = existingPages.length + 1;
let totalRecords = existingPages.length * PAGE_SIZE;
const resumeOffset = totalRecords;
let seenRecords = 0;
let sourceParts = 0;

function flushPage() {
  if (!pageRecords.length) return;
  const file = path.join(outputDir, `products-page-${String(pageNumber).padStart(5, '0')}.js`);
  const body = `// Bondsmall page-sized catalog chunk ${pageNumber}\nwindow.products = window.products || [];\nwindow.products.push(...${JSON.stringify(pageRecords)});\n`;
  fs.writeFileSync(file, body);
  pageRecords = [];
  pageNumber += 1;
}

const files = fs.readdirSync(sourceDir)
  .filter((name) => /^products-part-\d+\.js$/.test(name))
  .sort();
if (files.length !== expectedParts) {
  throw new Error(`Expected ${expectedParts} source chunks, found ${files.length}`);
}

for (const name of files) {
  const source = fs.readFileSync(path.join(sourceDir, name), 'utf8');
  const sandbox = { window: { products: [] } };
  vm.runInNewContext(source, sandbox, { filename: name, timeout: 30000 });
  const records = sandbox.window.products;
  if (!Array.isArray(records)) throw new Error(`${name} did not produce an array`);
  for (const record of records) {
    if (seenRecords < resumeOffset) {
      seenRecords += 1;
      continue;
    }
    seenRecords += 1;
    pageRecords.push(record);
    totalRecords += 1;
    if (pageRecords.length === PAGE_SIZE) flushPage();
  }
  sourceParts += 1;
  if (typeof global.gc === 'function') global.gc();
  if (sourceParts % 100 === 0) console.log(`processed source chunks ${sourceParts}/${files.length}; records ${seenRecords}; pages ${pageNumber - 1}`);
}
flushPage();

const pageCount = pageNumber - 1;
if (seenRecords !== 1231539) throw new Error(`Expected to see 1231539 records, saw ${seenRecords}`);
const manifest = {
  totalRecords,
  pageSize: PAGE_SIZE,
  pageCount,
  sourceParts,
  firstPage: 'products-page-00001.js',
  lastPage: `products-page-${String(pageCount).padStart(5, '0')}.js`,
};
fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest));
if (pageCount !== 61577) throw new Error(`Expected 61577 pages, wrote ${pageCount}`);
if (totalRecords !== 1231539) throw new Error(`Expected 1231539 records, wrote ${totalRecords}`);
