#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
requested = json.loads((ROOT / "requested-products.json").read_text(encoding="utf-8"))
by_file = {}
for product in requested:
    by_file.setdefault(product["_catalog_file"], set()).add(product["id"])

failures = []
checked = 0
gallery_count = 0
for filename, target_ids in by_file.items():
    path = ROOT / "catalog-pages" / filename
    text = path.read_text(encoding="utf-8")
    start = text.find("[", text.find("push(..."))
    end = text.rfind("]")
    products = json.loads(text[start : end + 1])
    found = set()
    for product in products:
        if product.get("id") not in target_ids:
            continue
        found.add(product["id"])
        checked += 1
        images = product.get("images") or []
        gallery_count += len(images)
        if not images or product.get("image") != images[0]:
            failures.append(f"{product['id']}: main image does not equal gallery first image")
        for rel in images:
            if not (ROOT / rel).is_file():
                failures.append(f"{product['id']}: missing {rel}")
    for missing_id in sorted(target_ids - found):
        failures.append(f"{missing_id}: not found in {filename}")

print(f"checked_products={checked}")
print(f"gallery_images={gallery_count}")
print("catalog_json_parse=true")
print(f"all_image_paths_exist={not failures}")
if failures:
    print("FAILURES:")
    print("\n".join(failures))
    raise SystemExit(1)
