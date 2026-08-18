import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
index_text = (ROOT / "catalog-category-index.js").read_text(encoding="utf-8")
index = json.loads(index_text[index_text.find("{") : index_text.rfind("}") + 1])
chunks = index.get("categories", index)["entertainment"]["chunks"][:12]
count = 0
for chunk in chunks:
    path = ROOT / "catalog-pages" / f"products-page-{int(chunk)+1:05d}.js"
    text = path.read_text(encoding="utf-8")
    marker = text.find("push(...")
    start = text.find("[", marker if marker >= 0 else 0)
    end = text.rfind("]")
    products = json.loads(text[start : end + 1])
    for product in products:
        if str(product.get("category", "")).lower() != "entertainment":
            continue
        count += 1
        image = product.get("image")
        image_path = ROOT / image if isinstance(image, str) and not image.startswith(("http://", "https://")) else None
        dimensions = "external"
        if image_path and image_path.is_file():
            try:
                with Image.open(image_path) as im:
                    dimensions = f"{im.width}x{im.height}"
            except Exception:
                dimensions = "unreadable"
        print(json.dumps({"chunk": path.name, "id": product.get("id"), "name": product.get("name"), "brand": product.get("brand") or product.get("specifications", {}).get("brand"), "image": image, "dimensions": dimensions, "images_count": len(product.get("images") or []), "source_url": product.get("source_url")}, ensure_ascii=False))
        if count >= 80:
            raise SystemExit
