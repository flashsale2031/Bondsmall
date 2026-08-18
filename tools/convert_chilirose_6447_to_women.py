from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "catalog-pages" / "products-page-00323.js"
PATTERN = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)

text = TARGET.read_text(encoding="utf-8")
match = PATTERN.search(text)
if not match:
    raise SystemExit(f"Could not parse catalog wrapper: {TARGET}")
records = json.loads("[" + match.group(1) + "]")
updated = None
for product in records:
    if product.get("id") != 6447:
        continue
    product.update({
        "name": "Chilirose - Babydoll CR 4830 Noir XL",
        "category": "women",
        "productType": "women",
        "gender": "Women",
        "description": product.get("description", "").replace("Chemise femme", "Women’s babydoll") if product.get("description") else "Women’s Chilirose Babydoll CR 4830 Noir XL lingerie set with lace detailing, plunging V neckline, matching thong, and 90% polyester / 10% elastane fabric.",
        "specifications": {
            "brand": "CHILIROSE BABYDOLLS",
            "material": "90% polyester, 10% elastane",
            "color": "Noir",
            "size": "XL",
            "product_type": "Babydoll lingerie set",
            "included": "Matching thong",
        },
        "source_url": "catalog-internal://product-6447/chilirose-babydoll-cr4830",
        "source_catalog": "Bondsmall catalog category conversion",
        "main_image_source_url": "catalog-internal://product-6447/preserved-gallery",
        "main_image_search_engine": "preserved-existing-product-gallery",
        "main_image_match_score": 100.0,
        "main_image_match_confidence": "preserved-existing-gallery",
        "secondary_image_source_url": "catalog-internal://product-6447/preserved-gallery",
        "secondary_image_search_engine": "preserved-existing-product-gallery",
        "secondary_image_match_confidence": "preserved-existing-gallery",
        "gallery_normalized": "preserved-chilirose-babydoll-gallery",
        "merchant_ready": True,
        "price_pending": True,
    })
    for legacy_key in [
        "source_brand", "source_row_index", "price_estimate_type", "price_estimate_segment",
        "luxury_comparable_range", "generic_comparable_range", "price_estimate_sources",
        "price_estimate_note", "main_image_previous",
    ]:
        product.pop(legacy_key, None)
    updated = product
    break
if updated is None:
    raise SystemExit("Product ID 6447 not found")

payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
TARGET.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)
report = {
    "id": 6447,
    "name": updated["name"],
    "category": updated["category"],
    "gender": updated["gender"],
    "productType": updated["productType"],
    "image": updated["image"],
    "images": updated["images"],
    "gallery_status": updated["gallery_normalized"],
}
(ROOT / "chilirose-women-conversion-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
