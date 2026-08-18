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
    if product.get("id") != 250:
        continue
    gallery = [
        "assets/bestchoice-kitchen-island/bestchoice-island-hero.jpg",
        "assets/bestchoice-kitchen-island/bestchoice-island-kitchen.jpg",
    ]
    product["image"] = gallery[0]
    product["images"] = gallery
    product["source_url"] = "https://www.target.com/p/best-choice-products-36in-large-rolling-kitchen-island-cart-2-door-cabinet-outlet-hooks-wheels/-/A-1009517804"
    product["main_image_source_url"] = "https://www.bestchoiceproducts.com/products/36in-large-rolling-kitchen-island-cart-2-door-cabinet-outlet-hooks-wheels"
    product["main_image_search_engine"] = "Best Choice Products exact product gallery"
    product["main_image_match_score"] = 100.0
    product["main_image_match_confidence"] = "verified-exact-product-gallery"
    product["secondary_image_source_url"] = "https://www.target.com/p/best-choice-products-36in-large-rolling-kitchen-island-cart-2-door-cabinet-outlet-hooks-wheels/-/A-1009517804"
    product["secondary_image_search_engine"] = "Target exact product gallery search"
    product["secondary_image_match_confidence"] = "verified-exact-product-gallery"
    product["secondary_image_storage"] = "repository-local"
    product["secondary_image_local_path"] = gallery[1]
    product["gallery_normalized"] = "verified-bestchoice-rolling-kitchen-island-gallery"
    updated = product
    break
if updated is None:
    raise SystemExit("Product ID 250 not found")

payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
TARGET.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)
report = {
    "id": 250,
    "name": updated["name"],
    "image": updated["image"],
    "images": updated["images"],
    "source": updated["source_url"],
    "match_confidence": updated["main_image_match_confidence"],
}
(ROOT / "bestchoice-island-image-fix-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
