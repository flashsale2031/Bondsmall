from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "catalog-pages" / "products-page-00012.js"
PATTERN = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)

text = TARGET.read_text(encoding="utf-8")
match = PATTERN.search(text)
if not match:
    raise SystemExit(f"Could not parse catalog wrapper: {TARGET}")
records = json.loads("[" + match.group(1) + "]")
updated = None
for product in records:
    if product.get("id") != 225:
        continue
    gallery = [
        "assets/tronsmart-g10/whatgeek-g10-hero.jpg",
        "assets/tronsmart-g10/whatgeek-g10-1.jpg",
        "assets/tronsmart-g10/whatgeek-g10-2.jpg",
    ]
    product["image"] = gallery[0]
    product["images"] = gallery
    product["main_image_source_url"] = "https://www.whatgeek.com/products/tronsmart-sounfii-g10-gaming-headphones"
    product["main_image_search_engine"] = "WhatGeek product gallery"
    product["main_image_match_score"] = 100.0
    product["main_image_match_confidence"] = "verified-product-gallery"
    product["secondary_image_source_url"] = "https://www.whatgeek.com/cdn/shop/files/Tronsmart_Sounfii_G10_Gaming_Headphones_1.jpg?v=1750756355&width=4096"
    product["secondary_image_search_engine"] = "WhatGeek product gallery"
    product["secondary_image_match_confidence"] = "verified-product-gallery"
    product["secondary_image_storage"] = "repository-local"
    product["secondary_image_local_path"] = gallery[1]
    product["gallery_normalized"] = "verified-tronsmart-g10-product-gallery"
    updated = product
    break
if updated is None:
    raise SystemExit("Product ID 225 not found")

payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
TARGET.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)
report = {
    "id": 225,
    "name": updated["name"],
    "image": updated["image"],
    "images": updated["images"],
    "source": updated["main_image_source_url"],
    "match_confidence": updated["main_image_match_confidence"],
}
(ROOT / "tronsmart-g10-image-fix-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
