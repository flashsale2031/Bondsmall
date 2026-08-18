import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS = {
    31105: ROOT / "catalog-pages" / "products-page-01556.js",
    46427: ROOT / "catalog-pages" / "products-page-02322.js",
}
PATTERN = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)
updates = []
for target_id, catalog_file in TARGETS.items():
    text = catalog_file.read_text(encoding="utf-8")
    match = PATTERN.search(text)
    if not match:
        raise RuntimeError(f"Could not parse catalog wrapper: {catalog_file}")
    records = json.loads("[" + match.group(1) + "]")
    found = None
    changed = False
    for product in records:
        if int(product.get("id", 0)) == target_id:
            found = product
            for key, value in (("category", "women"), ("gender", "Women"), ("productType", "women")):
                if product.get(key) != value:
                    product[key] = value
                    changed = True
            break
    if found is None:
        raise RuntimeError(f"Product {target_id} not found in {catalog_file}")
    if changed:
        payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
        catalog_file.write_text(
            "// Bondsmall page-sized catalog chunk\n"
            "window.products = window.products || [];\n"
            "window.products.push(..." + payload + ");\n",
            encoding="utf-8",
        )
    updates.append({
        "id": target_id,
        "name": found.get("name"),
        "category": found.get("category"),
        "gender": found.get("gender"),
        "productType": found.get("productType"),
        "changed": changed,
        "file": str(catalog_file.relative_to(ROOT)),
    })
(ROOT / "finetoo-womens-update-report.json").write_text(
    json.dumps({"matched_record_count": len(updates), "updates": updates}, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print(json.dumps(updates, ensure_ascii=False))
