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
    if product.get("id") != 249:
        continue
    gallery = [
        "assets/ninja-foodi-dz201/ninja-dz201-baskets-open.webp",
        "assets/ninja-foodi-dz201/ninja-dz201-control-panel.webp",
    ]
    product["image"] = gallery[0]
    product["images"] = gallery
    product["source_url"] = "https://www.bestbuy.com/product/ninja-foodi-6-in-1-8-qt-2-basket-air-fryer-with-dualzone-technology-air-fry-roast-broil-bake-reheat-dehydrate-dark-gray/JXJVXGZ273"
    product["main_image_source_url"] = "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6421/6421833_sd.jpg"
    product["main_image_search_engine"] = "Best Buy exact model product image search"
    product["main_image_match_score"] = 100.0
    product["main_image_match_confidence"] = "verified-exact-model-gallery"
    product["secondary_image_source_url"] = "https://www.bestbuy.com/product/ninja-foodi-6-in-1-8-qt-2-basket-air-fryer-with-dualzone-technology-air-fry-roast-broil-bake-reheat-dehydrate-dark-gray/JXJVXGZ273"
    product["secondary_image_search_engine"] = "Best Buy exact model gallery search"
    product["secondary_image_match_confidence"] = "verified-exact-model-gallery"
    product["secondary_image_storage"] = "repository-local"
    product["secondary_image_local_path"] = gallery[1]
    product["gallery_normalized"] = "verified-ninja-foodi-dz201-dualzone-gallery"
    updated = product
    break
if updated is None:
    raise SystemExit("Product ID 249 not found")

payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
TARGET.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)
report = {
    "id": 249,
    "name": updated["name"],
    "image": updated["image"],
    "images": updated["images"],
    "source": updated["source_url"],
    "match_confidence": updated["main_image_match_confidence"],
}
(ROOT / "ninja-dualzone-image-fix-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
