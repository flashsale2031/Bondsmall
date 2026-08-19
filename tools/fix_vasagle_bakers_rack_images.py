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
    if product.get("id") != 251:
        continue
    gallery = [
        "assets/vasagle-bakers-rack/vasagle-rack-hero.webp",
        "assets/vasagle-bakers-rack/vasagle-rack-kitchen.webp",
    ]
    product["image"] = gallery[0]
    product["images"] = gallery
    product["source_url"] = "https://www.target.com/p/vasagle-hutch-bakers-rack-with-power-outlet-14-hooks-microwave-stand-adjustable-coffee-bar-with-metal-wire-panel-kitchen-storage-shelf/-/A-91274972"
    product["main_image_source_url"] = "https://target.scene7.com/is/image/Target/GUEST_65c8c016-bdbe-42ec-ac11-9bae624670d9?wid=800&hei=800&qlt=80"
    product["main_image_search_engine"] = "Target exact product image search"
    product["main_image_match_score"] = 100.0
    product["main_image_match_confidence"] = "verified-exact-product-gallery"
    product["secondary_image_source_url"] = "https://www.target.com/p/vasagle-hutch-bakers-rack-with-power-outlet-14-hooks-microwave-stand-adjustable-coffee-bar-with-metal-wire-panel-kitchen-storage-shelf/-/A-91274972"
    product["secondary_image_search_engine"] = "Target exact product gallery search"
    product["secondary_image_match_confidence"] = "verified-exact-product-gallery"
    product["secondary_image_storage"] = "repository-local"
    product["secondary_image_local_path"] = gallery[1]
    product["gallery_normalized"] = "verified-vasagle-bakers-rack-power-outlet-gallery"
    updated = product
    break
if updated is None:
    raise SystemExit("Product ID 251 not found")

payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
TARGET.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)
report = {
    "id": 251,
    "name": updated["name"],
    "image": updated["image"],
    "images": updated["images"],
    "source": updated["source_url"],
    "match_confidence": updated["main_image_match_confidence"],
}
(ROOT / "vasagle-rack-image-fix-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
