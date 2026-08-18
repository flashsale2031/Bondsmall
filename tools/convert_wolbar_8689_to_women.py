from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "catalog-pages" / "products-page-00435.js"
PATTERN = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)

text = TARGET.read_text(encoding="utf-8")
match = PATTERN.search(text)
if not match:
    raise SystemExit(f"Could not parse catalog wrapper: {TARGET}")
records = json.loads("[" + match.group(1) + "]")
updated = None
for product in records:
    if product.get("id") != 8689:
        continue
    product.update({
        "name": "Shorts Model 127441 Wolbar",
        "category": "women",
        "productType": "women",
        "gender": "Women",
        "description": "Women’s Wolbar Model 127441 shorts made from soft knit and lace, with laser-cut waistband and leg fronts. Material: 83% polyamide and 17% elastane. Available sizes include S, M, L, and XL.",
        "specifications": {
            "brand": "Wolbar",
            "material": "83% polyamide, 17% elastane",
            "product_type": "Women’s shorts",
            "sizes": "S, M, L, XL",
        },
        "source_url": "catalog-internal://product-8689/wolbar-model-127441",
        "source_catalog": "Bondsmall catalog category conversion",
        "main_image_source_url": "catalog-internal://product-8689/preserved-gallery",
        "main_image_search_engine": "preserved-existing-product-gallery",
        "main_image_match_score": 100.0,
        "main_image_match_confidence": "preserved-existing-gallery",
        "secondary_image_source_url": "catalog-internal://product-8689/preserved-gallery",
        "secondary_image_search_engine": "preserved-existing-product-gallery",
        "secondary_image_match_confidence": "preserved-existing-gallery",
        "gallery_normalized": "preserved-wolbar-womens-shorts-gallery",
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
    raise SystemExit("Product ID 8689 not found")

payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
TARGET.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)
report = {
    "id": 8689,
    "name": updated["name"],
    "category": updated["category"],
    "gender": updated["gender"],
    "productType": updated["productType"],
    "image": updated["image"],
    "images": updated["images"],
    "gallery_status": updated["gallery_normalized"],
}
(ROOT / "wolbar-women-conversion-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
