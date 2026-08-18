from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "catalog-pages" / "products-page-00013.js"
PATTERN = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)

text = TARGET.read_text(encoding="utf-8")
match = PATTERN.search(text)
if not match:
    raise SystemExit(f"Could not parse catalog wrapper: {TARGET}")
records = json.loads("[" + match.group(1) + "]")
updated = None
for product in records:
    if product.get("id") != 244:
        continue
    gallery = [
        "assets/vusign-5qt-glass-airfryer/vusign-5qt-black.webp",
        "assets/vusign-5qt-glass-airfryer/vusign-5qt-capacity.jpg",
    ]
    product["image"] = gallery[0]
    product["images"] = gallery
    product["source_url"] = "https://www.bestbuy.com/product/vusign-air-fryer5-qt-glass-air-fryer-with-max-410f-led-digital-touchscreennonstick-dishwasher-safe-basket-black/CZ9G5PP24V"
    product["main_image_source_url"] = "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/be19d504-cb7e-4d22-a33c-6fca0656e81a.jpg;maxHeight=1920;maxWidth=900?format=webp"
    product["main_image_search_engine"] = "Best Buy exact product image"
    product["main_image_match_score"] = 100.0
    product["main_image_match_confidence"] = "verified-exact-product-gallery"
    product["secondary_image_source_url"] = "https://www.bestbuy.com/product/vusign-air-fryer5-qt-glass-air-fryer-with-max-410f-led-digital-touchscreennonstick-dishwasher-safe-basket-black/CZ9G5PP24V"
    product["secondary_image_search_engine"] = "Best Buy exact product image search"
    product["secondary_image_match_confidence"] = "verified-exact-product-gallery"
    product["secondary_image_storage"] = "repository-local"
    product["secondary_image_local_path"] = gallery[1]
    product["gallery_normalized"] = "verified-vusign-5qt-glass-airfryer-gallery"
    updated = product
    break
if updated is None:
    raise SystemExit("Product ID 244 not found")

payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
TARGET.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)
report = {
    "id": 244,
    "name": updated["name"],
    "image": updated["image"],
    "images": updated["images"],
    "source": updated["source_url"],
    "match_confidence": updated["main_image_match_confidence"],
}
(ROOT / "vusign-airfryer-image-fix-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
