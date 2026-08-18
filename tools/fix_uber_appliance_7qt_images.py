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
    if product.get("id") != 241:
        continue
    gallery = [
        "assets/uber-appliance-7qt/uber-7qt-kitchen.jpg",
        "assets/uber-appliance-7qt/uber-7qt-basket-detail.jpg",
    ]
    product["image"] = gallery[0]
    product["images"] = gallery
    product["source_url"] = "https://www.bestbuy.com/product/uber-appliance-xl-air-fryer-7qt-capacity-pfoa-ptfe-free-touchscreen-control-black-with-stainless-steel-accents/JXLLPFJTGR"
    product["main_image_source_url"] = "https://www.uberappliance.com/products/air-fryer-xl-premium-ceramic-coated-ptfe-pfoa-free-7qt-ss"
    product["main_image_search_engine"] = "Uber Appliance exact product gallery"
    product["main_image_match_score"] = 100.0
    product["main_image_match_confidence"] = "verified-exact-product-gallery"
    product["secondary_image_source_url"] = "https://www.uberappliance.com/products/air-fryer-xl-premium-ceramic-coated-ptfe-pfoa-free-7qt-ss"
    product["secondary_image_search_engine"] = "Uber Appliance exact product gallery"
    product["secondary_image_match_confidence"] = "verified-exact-product-gallery"
    product["secondary_image_storage"] = "repository-local"
    product["secondary_image_local_path"] = gallery[1]
    product["gallery_normalized"] = "verified-uber-appliance-xl-7qt-gallery"
    updated = product
    break
if updated is None:
    raise SystemExit("Product ID 241 not found")

payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
TARGET.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)
report = {
    "id": 241,
    "name": updated["name"],
    "image": updated["image"],
    "images": updated["images"],
    "source": updated["source_url"],
    "match_confidence": updated["main_image_match_confidence"],
}
(ROOT / "uber-airfryer-image-fix-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
