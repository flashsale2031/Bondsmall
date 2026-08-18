from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "catalog-pages" / "products-page-00111.js"
PATTERN = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)

text = TARGET.read_text(encoding="utf-8")
match = PATTERN.search(text)
if not match:
    raise SystemExit(f"Could not parse catalog wrapper: {TARGET}")
records = json.loads("[" + match.group(1) + "]")
updated = None
for product in records:
    if product.get("id") != 2215:
        continue
    gallery = [
        "assets/universal-thread-oatmeal-cardigan/universal-thread-cardigan-front-1.jpg",
        "assets/universal-thread-oatmeal-cardigan/universal-thread-cardigan-front-2.jpg",
    ]
    product.update({
        "name": "Women's Iconic Cotton Cardigan - Universal Thread Oatmeal M",
        "category": "women",
        "retail price": 35.99,
        "sale price": 35.99,
        "image": gallery[0],
        "description": "Universal Thread women's long-sleeve cardigan in oatmeal, made from 100% cotton shaker fabric with a crew neckline, button-down front, ribbed cuffs and hem, classic fit, and mid-length silhouette.",
        "images": gallery,
        "specifications": {
            "brand": "Universal Thread",
            "color": "Oatmeal",
            "size": "M",
            "material": "100% cotton shaker fabric",
            "neckline": "Crew neck",
            "closure": "Button front",
            "sleeves": "Long sleeve",
            "fit": "Classic fit",
            "length": "Mid length",
        },
        "sku": "BM-2215",
        "productType": "women",
        "inventory": 1,
        "age_group": "Adult",
        "gender": "Women",
        "source_url": "https://www.target.com/p/women-39-s-iconic-cotton-cardigan-universal-thread-8482-oatmeal-m/-/A-95025138",
        "source_catalog": "Target product listing",
        "main_image_source_url": "https://www.target.com/p/women-39-s-iconic-cotton-cardigan-universal-thread-8482-oatmeal-m/-/A-95025138",
        "main_image_search_engine": "Target exact product image search",
        "main_image_match_score": 100.0,
        "main_image_match_confidence": "verified-exact-product-gallery",
        "secondary_image_source_url": "https://www.target.com/p/women-39-s-iconic-cotton-cardigan-universal-thread-8482-oatmeal-m/-/A-95025138",
        "secondary_image_search_engine": "Target exact product gallery search",
        "secondary_image_match_confidence": "verified-exact-product-gallery",
        "secondary_image_storage": "repository-local",
        "secondary_image_local_path": gallery[1],
        "gallery_normalized": "verified-universal-thread-oatmeal-cardigan-gallery",
        "price_currency": "USD",
        "price_is_estimate": False,
        "price_pending": False,
        "merchant_ready": True,
        "price_benchmark_method": "Target listed price rounded to commercial .99 presentation.",
        "price_benchmark_sources": [
            {"retailer": "Target", "url": "https://www.target.com/p/women-39-s-iconic-cotton-cardigan-universal-thread-8482-oatmeal-m/-/A-95025138", "observed_price": "$35.00", "role": "retailer listed price"}
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
    raise SystemExit("Product ID 2215 not found")

payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
TARGET.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)
report = {
    "id": 2215,
    "old_product": "Osh25Wbcd19118Tm1 / Town Team - Over Shirts",
    "new_product": updated["name"],
    "image": updated["image"],
    "images": updated["images"],
    "source": updated["source_url"],
    "retail_price": updated["retail price"],
    "sale_price": updated["sale price"],
    "match_confidence": updated["main_image_match_confidence"],
}
(ROOT / "product-2215-replacement-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
