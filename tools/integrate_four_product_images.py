import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = "assets/manufacturer-images"
MAPPING = {
    24: ["24-corrected.png"],
    159: ["159-corrected.jpg"],
    221: ["221-corrected.jpeg"],
    223: ["223-corrected.jpg"],
    224: ["224-corrected.jpeg"],
    226: ["226-corrected.jpg"],
    228: ["228-corrected.jpg"],
    229: ["229-corrected.jpg"],
    230: ["230-corrected.jpg"],
    233: ["233-corrected.jpg"],
    240: ["240-corrected.png"],
}

records_by_file = {}
for path in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
    text = path.read_text(encoding="utf-8")
    marker = text.find("push(...")
    start = text.find("[", marker if marker >= 0 else 0)
    end = text.rfind("]")
    products = json.loads(text[start : end + 1])
    changed = False
    for product in products:
        product_id = int(product.get("id", 0))
        if product_id not in MAPPING:
            continue
        gallery = [f"{ASSET_ROOT}/{filename}" for filename in MAPPING[product_id]]
        product["image"] = gallery[0]
        product["images"] = gallery
        product["gallery_normalized"] = "corrected-brand-specific-single-image"
        changed = True
        print(f"{path.name}: {product_id} {product.get('name')} -> {gallery[0]}")
    if changed:
        prefix = text[:start]
        suffix = text[end + 1:]
        path.write_text(prefix + json.dumps(products, ensure_ascii=False, separators=(",", ":")) + suffix, encoding="utf-8")
        records_by_file[path.name] = True

missing = sorted(set(MAPPING) - {int(line.split()[1]) for line in []})
if not records_by_file:
    raise SystemExit("No catalog chunks were updated")
print(f"Updated {len(MAPPING)} mapped records across {len(records_by_file)} chunks")
