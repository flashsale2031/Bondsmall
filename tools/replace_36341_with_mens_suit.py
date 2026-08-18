import copy
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET_ID = 36341
SOURCE_ID = 8842
TARGET_FILE = ROOT / "catalog-pages" / "products-page-01817.js"
PATTERN = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)

records_by_file = {}
source = None
for catalog_file in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
    text = catalog_file.read_text(encoding="utf-8")
    match = PATTERN.search(text)
    if not match:
        raise RuntimeError(f"Could not parse catalog wrapper: {catalog_file}")
    records = json.loads("[" + match.group(1) + "]")
    records_by_file[catalog_file] = records
    for product in records:
        if int(product.get("id", 0)) == SOURCE_ID:
            source = copy.deepcopy(product)
            source_file = catalog_file

if source is None:
    raise RuntimeError(f"Replacement source product {SOURCE_ID} not found")

target_records = records_by_file[TARGET_FILE]
target_index = next((i for i, p in enumerate(target_records) if int(p.get("id", 0)) == TARGET_ID), None)
if target_index is None:
    raise RuntimeError(f"Target product {TARGET_ID} not found in {TARGET_FILE}")

old = target_records[target_index]
replacement = source
replacement["id"] = TARGET_ID
replacement["sku"] = f"BM-{TARGET_ID}"
replacement["category"] = "men"
replacement["gender"] = "Men"
replacement["productType"] = "men"
replacement["replacement_source_product_id"] = SOURCE_ID
replacement["replacement_source_name"] = source.get("name")
replacement["replacement_source_catalog_file"] = str(source_file.relative_to(ROOT))
replacement["replacement_reason"] = "Replaced at user request with a different men’s product."
replacement["merchant_ready"] = False

target_records[target_index] = replacement
payload = json.dumps(target_records, ensure_ascii=False, separators=(",", ":"))
TARGET_FILE.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)

report = {
    "target_id": TARGET_ID,
    "old_name": old.get("name"),
    "new_name": replacement.get("name"),
    "new_category": replacement.get("category"),
    "new_gender": replacement.get("gender"),
    "new_product_type": replacement.get("productType"),
    "source_product_id": SOURCE_ID,
    "source_product_name": source.get("name"),
    "source_catalog_file": str(source_file.relative_to(ROOT)),
    "target_catalog_file": str(TARGET_FILE.relative_to(ROOT)),
    "image_count": len(replacement.get("images") or []),
}
(ROOT / "product-36341-replacement-report.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(report, ensure_ascii=False))
