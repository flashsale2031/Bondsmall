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
    gallery = [
        "assets/all-in-motion-green-jacquard-polo/all-in-motion-polo-front-1.jpg",
        "assets/all-in-motion-green-jacquard-polo/all-in-motion-polo-front-2.jpg",
    ]
    product.update({
        "name": "Men's Jacquard Polo Shirt - All in Motion Green L",
        "category": "men",
        "retail price": 29.99,
        "sale price": 19.99,
        "image": gallery[0],
        "description": "Men's short-sleeve jacquard polo shirt in green from All in Motion, designed for travel, outdoor activities, and everyday wear. Made with a cotton, recycled polyester, and spandex blend with a polo collar, regular fit, and at-hip length.",
        "images": gallery,
        "specifications": {
            "brand": "All in Motion",
            "color": "Green",
            "size": "L",
            "material": "Cotton, recycled polyester, and spandex blend",
            "style": "Jacquard polo",
            "sleeves": "Short sleeve",
            "fit": "Regular fit",
            "length": "At hip",
            "care": "Machine wash and tumble dry",
        },
        "sku": "BM-1927",
        "productType": "men",
        "inventory": 1,
        "age_group": "Adult",
        "gender": "Men",
        "source_url": "https://www.target.com/p/men-39-s-jacquard-polo-shirt-all-in-motion-8482-green-l/-/A-94907322",
        "source_catalog": "Target product listing",
        "main_image_source_url": "https://www.target.com/p/men-39-s-jacquard-polo-shirt-all-in-motion-8482-green-l/-/A-94907322",
        "main_image_search_engine": "Target exact product image search",
        "main_image_match_score": 100.0,
        "main_image_match_confidence": "verified-exact-product-gallery",
        "secondary_image_source_url": "https://www.target.com/p/men-39-s-jacquard-polo-shirt-all-in-motion-8482-green-l/-/A-94907322",
        "secondary_image_search_engine": "Target exact product gallery search",
        "secondary_image_match_confidence": "verified-exact-product-gallery",
        "secondary_image_storage": "repository-local",
        "secondary_image_local_path": gallery[1],
        "gallery_normalized": "verified-all-in-motion-green-jacquard-polo-gallery",
        "price_currency": "USD",
        "price_is_estimate": False,
        "price_pending": False,
        "merchant_ready": True,
        "price_benchmark_method": "Target listed regular price of $30.00 and current sale range rounded to commercial .99 presentation.",
        "price_benchmark_sources": [
            {"retailer": "Target", "url": "https://www.target.com/p/men-39-s-jacquard-polo-shirt-all-in-motion-8482-green-l/-/A-94907322", "observed_price": "$30.00 regular listing; comparable green sizes currently discounted", "role": "retailer listed price"}
        ],
    })
    for legacy_key in [
        "source_brand", "source_row_index", "price_pending", "price_estimate_type",
        "price_estimate_segment", "luxury_comparable_range", "generic_comparable_range",
        "price_estimate_sources", "price_estimate_note", "main_image_previous",
    ]:
        product.pop(legacy_key, None)
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
    "old_product": "250% Density Chocolate Brown Lace Front Wig Human Hair 13x4 Body Wave Lace Front Wigs with Baby Hair Colored Human Hair Wigs For Women HD Transparent",
    "new_product": updated["name"],
    "category": updated["category"],
    "image": updated["image"],
    "images": updated["images"],
    "source": updated["source_url"],
    "retail_price": updated["retail price"],
    "sale_price": updated["sale price"],
    "match_confidence": updated["main_image_match_confidence"],
}
(ROOT / "wig-replacement-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
