import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET_ID = 24155
CATALOG_FILE = ROOT / "catalog-pages" / "products-page-01208.js"
PATTERN = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)

text = CATALOG_FILE.read_text(encoding="utf-8")
match = PATTERN.search(text)
if not match:
    raise RuntimeError(f"Could not parse catalog wrapper: {CATALOG_FILE}")
records = json.loads("[" + match.group(1) + "]")
found = None
changed = False
for product in records:
    if int(product.get("id", 0)) == TARGET_ID:
        found = product
        for key, value in (("category", "women"), ("gender", "Women"), ("productType", "women")):
            if product.get(key) != value:
                product[key] = value
                changed = True
        break
if found is None:
    raise RuntimeError(f"Product {TARGET_ID} not found")
if changed:
    payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
    CATALOG_FILE.write_text(
        "// Bondsmall page-sized catalog chunk\n"
        "window.products = window.products || [];\n"
        "window.products.push(..." + payload + ");\n",
        encoding="utf-8",
    )
report = {
    "id": TARGET_ID,
    "name": found.get("name"),
    "category": found.get("category"),
    "gender": found.get("gender"),
    "productType": found.get("productType"),
    "changed": changed,
}
(ROOT / "product-24155-womens-update-report.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(report, ensure_ascii=False))
