import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
expected = {
    24: "assets/manufacturer-images/24-corrected.webp",
    159: "assets/manufacturer-images/159-corrected.webp",
    221: "assets/manufacturer-images/221-corrected.webp",
    223: "assets/manufacturer-images/223-corrected.webp",
    224: "assets/manufacturer-images/224-corrected.webp",
    226: "assets/manufacturer-images/226-corrected.webp",
    228: "assets/manufacturer-images/228-corrected.webp",
    229: "assets/manufacturer-images/229-corrected.webp",
    230: "assets/manufacturer-images/230-corrected.webp",
    233: "assets/manufacturer-images/233-corrected.webp",
    240: "assets/manufacturer-images/240-corrected.webp",
}
found = {}
for path in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
    text = path.read_text(encoding="utf-8")
    marker = text.find("push(...")
    start = text.find("[", marker if marker >= 0 else 0)
    end = text.rfind("]")
    products = json.loads(text[start : end + 1])
    for product in products:
        product_id = int(product.get("id", 0))
        if product_id not in expected:
            continue
        found[product_id] = product
        assert product.get("image") == expected[product_id], (product_id, product.get("image"))
        assert product.get("images") == [expected[product_id]], (product_id, product.get("images"))
        assert (ROOT / expected[product_id]).is_file(), expected[product_id]

assert set(found) == set(expected), sorted(set(expected) - set(found))
for product_id in sorted(found):
    print(f"{product_id}: OK — {found[product_id]['name']} — {found[product_id]['image']}")
print(f"Verified {len(found)} corrected product records")
