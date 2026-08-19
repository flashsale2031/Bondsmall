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
    if product.get("id") != 242:
        continue
    gallery = [
        "assets/frigidaire-gcws2438ab/gcws2438ab-front.webp",
        "assets/frigidaire-gcws2438ab/gcws2438ab-air-fry-control.webp",
        "assets/frigidaire-gcws2438ab/gcws2438ab-interior.webp",
    ]
    product["image"] = gallery[0]
    product["images"] = gallery
    product["source_url"] = "https://www.bestbuy.com/product/frigidaire-gallery-24-built-in-single-electric-wall-oven-with-air-fry-black/J7CJ3R8XZC"
    product["main_image_source_url"] = "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6522/6522263_sd.jpg;maxHeight=1920;maxWidth=900?format=webp"
    product["main_image_search_engine"] = "Best Buy exact model product gallery"
    product["main_image_match_score"] = 100.0
    product["main_image_match_confidence"] = "verified-exact-model-gallery"
    product["secondary_image_source_url"] = "https://www.bestbuy.com/product/frigidaire-gallery-24-built-in-single-electric-wall-oven-with-air-fry-black/J7CJ3R8XZC"
    product["secondary_image_search_engine"] = "Best Buy exact model product gallery"
    product["secondary_image_match_confidence"] = "verified-exact-model-gallery"
    product["secondary_image_storage"] = "repository-local"
    product["secondary_image_local_path"] = gallery[1]
    product["gallery_normalized"] = "verified-frigidaire-gcws2438ab-gallery"
    updated = product
    break
if updated is None:
    raise SystemExit("Product ID 242 not found")

payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
TARGET.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)
report = {
    "id": 242,
    "name": updated["name"],
    "image": updated["image"],
    "images": updated["images"],
    "source": updated["source_url"],
    "match_confidence": updated["main_image_match_confidence"],
}
(ROOT / "frigidaire-oven-image-fix-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
