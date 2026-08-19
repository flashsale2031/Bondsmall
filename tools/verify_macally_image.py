import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
expected = "assets/manufacturer-images/212-corrected.webp"
found = None
for path in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
    text = path.read_text(encoding="utf-8")
    marker = text.find("push(...")
    start = text.find("[", marker if marker >= 0 else 0)
    end = text.rfind("]")
    products = json.loads(text[start : end + 1])
    for product in products:
        if int(product.get("id", 0)) == 212:
            found = product
assert found is not None
assert found["name"] == "Macally Bluetooth Keyboard and Mouse"
assert found["image"] == expected
assert found["images"] == [expected]
assert (ROOT / expected).is_file()
print(json.dumps({"id": 212, "name": found["name"], "image": found["image"], "gallery_count": len(found["images"]), "source": found["main_image_source_url"]}, indent=2))
