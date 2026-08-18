import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
updated_chunks = 0
updated_records = 0

for path in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
    text = path.read_text(encoding="utf-8")
    marker = text.find("push(...")
    start = text.find("[", marker if marker >= 0 else 0)
    end = text.rfind("]")
    products = json.loads(text[start : end + 1])
    changed = False
    for product in products:
        if str(product.get("category", "")).lower() != "entertainment":
            continue
        image = product.get("image")
        gallery = product.get("images") or []
        if isinstance(image, list):
            image = image[0] if image else None
        if not isinstance(image, str) or not image:
            image = next((value for value in gallery if isinstance(value, str) and value), None)
        if not image:
            continue
        desired = [image]
        if product.get("image") != image or product.get("images") != desired or product.get("gallery_normalized") != "entertainment-product-only-main-image":
            product["image"] = image
            product["images"] = desired
            product["gallery_normalized"] = "entertainment-product-only-main-image"
            updated_records += 1
            changed = True
    if changed:
        path.write_text(text[:start] + json.dumps(products, ensure_ascii=False, separators=(",", ":")) + text[end + 1:], encoding="utf-8")
        updated_chunks += 1

print(json.dumps({"updated_chunks": updated_chunks, "updated_records": updated_records}))
