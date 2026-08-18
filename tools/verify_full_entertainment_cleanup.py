import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
expected_count = 21218
records = 0
chunks = 0
bad = []
for path in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
    text = path.read_text(encoding="utf-8")
    marker = text.find("push(...")
    start = text.find("[", marker if marker >= 0 else 0)
    end = text.rfind("]")
    products = json.loads(text[start : end + 1])
    chunk_count = 0
    for product in products:
        if str(product.get("category", "")).lower() != "entertainment":
            continue
        records += 1
        chunk_count += 1
        image = product.get("image")
        gallery = product.get("images")
        if not isinstance(image, str) or gallery != [image] or product.get("gallery_normalized") != "entertainment-product-only-main-image":
            bad.append({"id": product.get("id"), "name": product.get("name"), "image": image, "images": gallery, "marker": product.get("gallery_normalized")})
    if chunk_count:
        chunks += 1
assert records == expected_count, (records, expected_count)
assert not bad, bad[:5]
css = (ROOT / "bondsmall.css").read_text(encoding="utf-8")
assert ".product-image" in css and "object-fit: contain" in css
print(json.dumps({"entertainment_records": records, "entertainment_chunks": chunks, "invalid_records": len(bad), "grid_images_contain": True}, indent=2))
