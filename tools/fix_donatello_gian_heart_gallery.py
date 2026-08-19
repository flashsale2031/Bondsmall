import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET_ID = 289
CATALOG_FILE = ROOT / "catalog-pages" / "products-page-00015.js"
LOCAL_IMAGES = [
    "assets/donatello-gian-heart-set/heart-set-1.webp",
    "assets/donatello-gian-heart-set/heart-set-2.webp",
    "assets/donatello-gian-heart-set/heart-set-3.webp",
]
SOURCE_URL = "https://www.nordstrom.com/s/earrings-necklace-and-bracelet-heart-jewelry-set/8849863"
PATTERN = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)

text = CATALOG_FILE.read_text(encoding="utf-8")
match = PATTERN.search(text)
if not match:
    raise RuntimeError(f"Could not parse catalog wrapper: {CATALOG_FILE}")
records = json.loads("[" + match.group(1) + "]")
found = None
for product in records:
    if int(product.get("id", 0)) == TARGET_ID:
        found = product
        break
if found is None:
    raise RuntimeError(f"Product {TARGET_ID} not found")

old_images = found.get("images") or []
old_image = found.get("image")
found["image"] = LOCAL_IMAGES[0]
found["images"] = LOCAL_IMAGES
found["image_replacement_source_url"] = SOURCE_URL
found["image_replacement_local_paths"] = LOCAL_IMAGES
found["image_replacement_search_engine"] = "image search"
found["image_replacement_match_confidence"] = "verified product-specific"
found["image_replacement_note"] = "Replaced all prior images with three matching heart jewelry set images."

payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
CATALOG_FILE.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)
report = {
    "id": TARGET_ID,
    "name": found.get("name"),
    "old_image": old_image,
    "old_images": old_images,
    "new_image": LOCAL_IMAGES[0],
    "new_images": LOCAL_IMAGES,
    "source_url": SOURCE_URL,
    "changed": True,
}
(ROOT / "donatello-gian-heart-gallery-update-report.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(report, ensure_ascii=False))
