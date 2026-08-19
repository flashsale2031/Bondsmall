import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET_ID = 9452
CATALOG_FILE = ROOT / "catalog-pages" / "products-page-00473.js"
PATTERN = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)
GALLERY = [
    "assets/boost-erotic-lingerie/boost-1.webp",
    "assets/boost-erotic-lingerie/boost-2.webp",
    "assets/boost-erotic-lingerie/boost-3.webp",
    "assets/boost-erotic-lingerie/boost-4.webp",
]

text = CATALOG_FILE.read_text(encoding="utf-8")
match = PATTERN.search(text)
if not match:
    raise RuntimeError(f"Could not parse catalog wrapper: {CATALOG_FILE}")
records = json.loads("[" + match.group(1) + "]")
updated = None
for product in records:
    if int(product.get("id", 0)) == TARGET_ID:
        product["name"] = "Boost"
        product["category"] = "women"
        product["gender"] = "Women"
        product["productType"] = "women"
        product["image"] = GALLERY[0]
        product["images"] = GALLERY
        product["gallery"] = GALLERY
        product["manufacturer_source_url"] = "https://oshunlabel.com/products/boost-erotic-lingerie-set"
        product["manufacturer_gallery_match"] = "exact"
        product["gallery_source"] = "Oshun Label official BOOST Erotic Lingerie Set listing"
        product["gallery_verified"] = True
        product["gallery_image_count"] = len(GALLERY)
        product["merchant_ready"] = True
        updated = {
            "id": product["id"],
            "name": product["name"],
            "category": product["category"],
            "gender": product["gender"],
            "image_count": len(product["images"]),
        }
        break

if updated is None:
    raise RuntimeError(f"Product {TARGET_ID} not found")

payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
CATALOG_FILE.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)
(ROOT / "boost-womens-gallery-update-report.json").write_text(
    json.dumps(
        {
            "updated": updated,
            "gallery": GALLERY,
            "source_url": "https://oshunlabel.com/products/boost-erotic-lingerie-set",
            "note": "Four exact product photos downloaded from the official product gallery.",
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)
print(json.dumps(updated, ensure_ascii=False))
