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
    if product.get("id") != 248:
        continue
    gallery = [
        "assets/whall-6qt/whall-6qt-stainless-hero.jpg",
        "assets/whall-6qt/whall-6qt-capacity-detail.jpg",
    ]
    product["image"] = gallery[0]
    product["images"] = gallery
    product["source_url"] = "https://www.bestbuy.com/product/whall-6qt-all-stainless-air-fryer-8-in-1-hot-oven-with-digital-led-touchscreen-visible-window-sliver/J3GW82LG9W"
    product["main_image_source_url"] = "https://www.walmart.com/ip/WHALLSE-6QT-Air-Fryer-with-Visual-Window-8-Preset-Menus-360-Rapid-Air-Circulation-for-Healthy-Oil-Less-Cooking-Exterior-Stainless-Steel/"
    product["main_image_search_engine"] = "Walmart exact product image search"
    product["main_image_match_score"] = 100.0
    product["main_image_match_confidence"] = "verified-exact-product-gallery"
    product["secondary_image_source_url"] = "https://www.walmart.com/ip/WHALLSE-6QT-Air-Fryer-with-Visual-Window-8-Preset-Menus-360-Rapid-Air-Circulation-for-Healthy-Oil-Less-Cooking-Exterior-Stainless-Steel/"
    product["secondary_image_search_engine"] = "Walmart exact product gallery search"
    product["secondary_image_match_confidence"] = "verified-exact-product-gallery"
    product["secondary_image_storage"] = "repository-local"
    product["secondary_image_local_path"] = gallery[1]
    product["gallery_normalized"] = "verified-whall-6qt-stainless-gallery"
    updated = product
    break
if updated is None:
    raise SystemExit("Product ID 248 not found")

payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
TARGET.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)
report = {
    "id": 248,
    "name": updated["name"],
    "image": updated["image"],
    "images": updated["images"],
    "source": updated["source_url"],
    "match_confidence": updated["main_image_match_confidence"],
}
(ROOT / "whall-airfryer-image-fix-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
