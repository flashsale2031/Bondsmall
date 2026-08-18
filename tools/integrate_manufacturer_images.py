#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUESTED = ROOT / "requested-products.json"
ASSET_DIR = ROOT / "assets" / "manufacturer-images"


def image_files_for(product_id: int):
    prefix = f"{product_id}-"
    files = sorted((p for p in ASSET_DIR.iterdir() if p.is_file() and p.name.startswith(prefix)), key=lambda p: p.name)
    if not files:
        raise FileNotFoundError(f"No manufacturer/fallback assets found for product {product_id}")

    names = [p.name for p in files]
    # Prefer the explicitly selected fallback or official single-image capture when available.
    preferred = [n for n in names if "-search." in n or "-official." in n or "-browser.webp" in n]
    if preferred:
        # For browser captures, retain one supporting normalized image if it exists.
        if any("-browser.webp" in n for n in preferred):
            supporting = [n for n in names if n.endswith(".jpg") and not "-search." in n]
            selected = [n for n in preferred if n.endswith("-browser.webp")]
            if supporting:
                selected += supporting[:1]
            return selected
        return preferred

    # Normalized downloaded galleries are named id-0, id-1, etc.; retain all available views.
    return names


def load_js_array(path: Path):
    text = path.read_text(encoding="utf-8")
    push_marker = text.find("push(...")
    start = text.find("[", push_marker if push_marker >= 0 else 0)
    end = text.rfind("]")
    if start < 0 or end <= start:
        raise ValueError(f"Could not locate product array in {path}")
    data = json.loads(text[start : end + 1])
    return text, start, end, data


def main():
    requested = json.loads(REQUESTED.read_text(encoding="utf-8"))
    by_file = {}
    for product in requested:
        if "_catalog_file" not in product:
            raise ValueError(f"Missing _catalog_file for product {product.get('id')}")
        by_file.setdefault(product["_catalog_file"], {})[product["id"]] = product["name"]

    changed = []
    for catalog_file, target_ids in sorted(by_file.items()):
        path = ROOT / "catalog-pages" / catalog_file
        text, start, end, products = load_js_array(path)
        found = set()
        for product in products:
            if product.get("id") not in target_ids:
                continue
            product_id = product["id"]
            asset_names = image_files_for(product_id)
            rel = [f"assets/manufacturer-images/{name}" for name in asset_names]
            product["image"] = rel[0]
            product["images"] = rel
            found.add(product_id)
            changed.append((product_id, target_ids[product_id], catalog_file, rel))
        missing = set(target_ids) - found
        if missing:
            raise ValueError(f"Catalog file {catalog_file} missing requested IDs: {sorted(missing)}")
        serialized = json.dumps(products, ensure_ascii=False, separators=(",", ":"))
        path.write_text(text[:start] + serialized + text[end + 1 :], encoding="utf-8")

    print(f"Updated {len(changed)} products across {len(by_file)} catalog files.")
    for product_id, name, catalog_file, rel in sorted(changed):
        print(f"{product_id}\t{catalog_file}\t{name}\t{len(rel)} images\t{rel[0]}")


if __name__ == "__main__":
    main()
