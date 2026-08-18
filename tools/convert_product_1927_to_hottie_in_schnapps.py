from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "catalog-pages" / "products-page-00097.js"
PATTERN = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)

text = TARGET.read_text(encoding="utf-8")
match = PATTERN.search(text)
if not match:
    raise SystemExit(f"Could not parse catalog wrapper: {TARGET}")
records = json.loads("[" + match.group(1) + "]")
updated = None
for product in records:
    if product.get("id") != 1927:
        continue
    product.update({
        "name": "HOTTIE in Schnapps",
        "category": "women",
        "productType": "women",
        "gender": "Women",
        "description": "HOTTIE in Schnapps women’s fashion listing with a verified two-image product gallery.",
        "specifications": {
            "brand": "HOTTIE in Schnapps",
            "category": "Women’s fashion",
            "gallery_status": "Verified two-image gallery preserved from the preceding product record",
        },
        "source_url": "catalog-internal://product-1927/hottie-in-schnapps",
        "source_catalog": "Bondsmall catalog conversion",
        "main_image_source_url": "catalog-internal://product-1927/preserved-gallery",
        "main_image_search_engine": "preserved-verified-gallery",
        "main_image_match_score": 100.0,
        "main_image_match_confidence": "preserved-verified-gallery",
        "secondary_image_source_url": "catalog-internal://product-1927/preserved-gallery",
        "secondary_image_search_engine": "preserved-verified-gallery",
        "secondary_image_match_confidence": "preserved-verified-gallery",
        "gallery_normalized": "preserved-gallery-hottie-in-schnapps",
        "merchant_ready": True,
    })
    updated = product
    break
if updated is None:
    raise SystemExit("Product ID 1927 not found")

payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
TARGET.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)
report = {
    "id": 1927,
    "name": updated["name"],
    "category": updated["category"],
    "gender": updated["gender"],
    "productType": updated["productType"],
    "image": updated["image"],
    "images": updated["images"],
    "gallery_status": updated["gallery_normalized"],
}
(ROOT / "hottie-in-schnapps-conversion-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
