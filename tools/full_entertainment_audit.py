import json
import re
from collections import Counter
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
index_text = (ROOT / "catalog-category-index.js").read_text(encoding="utf-8")
index = json.loads(index_text[index_text.find("{") : index_text.rfind("}") + 1])
category = index.get("categories", index)["entertainment"]
chunk_ids = category["chunks"]

records = []
for chunk_id in chunk_ids:
    path = ROOT / "catalog-pages" / f"products-page-{int(chunk_id)+1:05d}.js"
    text = path.read_text(encoding="utf-8")
    marker = text.find("push(...")
    start = text.find("[", marker if marker >= 0 else 0)
    end = text.rfind("]")
    products = json.loads(text[start : end + 1])
    for product in products:
        if str(product.get("category", "")).lower() != "entertainment":
            continue
        image = product.get("image")
        gallery = product.get("images") or []
        local_paths = [x for x in gallery if isinstance(x, str) and not x.startswith(("http://", "https://"))]
        dimensions = []
        unreadable = 0
        for value in gallery:
            if not isinstance(value, str) or value.startswith(("http://", "https://")):
                continue
            file_path = ROOT / value
            if not file_path.is_file():
                unreadable += 1
                continue
            try:
                with Image.open(file_path) as im:
                    dimensions.append((im.width, im.height))
            except Exception:
                unreadable += 1
        primary_dimensions = dimensions[0] if dimensions else None
        risk = []
        if not isinstance(image, str) or image.startswith(("http://", "https://")):
            risk.append("external-image")
        if not dimensions:
            risk.append("no-local-dimensions")
        if primary_dimensions:
            width, height = primary_dimensions
            ratio = width / height if height else 0
            if min(width, height) < 500:
                risk.append("low-resolution")
            if ratio > 1.55 or ratio < 0.67:
                risk.append("banner-or-crop-risk")
        if len(gallery) < 3:
            risk.append("thin-gallery")
        if any("main-images/hf-" in str(x) for x in gallery):
            risk.append("generic-hf-asset")
        if any("61zNIJh6ZCL" in str(x) for x in gallery):
            risk.append("repeated-placeholder-gallery")
        records.append({
            "chunk": path.name,
            "chunk_id": int(chunk_id),
            "id": product.get("id"),
            "name": product.get("name"),
            "brand": product.get("brand") or product.get("specifications", {}).get("brand"),
            "image": image,
            "images": gallery,
            "source_url": product.get("source_url"),
            "source_catalog": product.get("source_catalog"),
            "dimensions": dimensions,
            "primary_dimensions": primary_dimensions,
            "risk_flags": risk,
        })

out = ROOT / "entertainment-image-audit.jsonl"
out.write_text("".join(json.dumps(record, ensure_ascii=False) + "\n" for record in records), encoding="utf-8")
counts = Counter(flag for record in records for flag in record["risk_flags"])
summary = {
    "category_index_count": category.get("count"),
    "audited_records": len(records),
    "audited_chunks": len(chunk_ids),
    "risk_counts": counts,
    "records_with_any_risk": sum(bool(record["risk_flags"]) for record in records),
}
(ROOT / "entertainment-image-audit-summary.json").write_text(json.dumps(summary, indent=2, default=int), encoding="utf-8")
print(json.dumps(summary, indent=2, default=int))
