import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET_ID = 212
asset = "assets/manufacturer-images/212-corrected.webp"
updated = False
for path in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
    text = path.read_text(encoding="utf-8")
    marker = text.find("push(...")
    start = text.find("[", marker if marker >= 0 else 0)
    end = text.rfind("]")
    products = json.loads(text[start : end + 1])
    changed = False
    for product in products:
        if int(product.get("id", 0)) != TARGET_ID:
            continue
        product["image"] = asset
        product["images"] = [asset]
        product["gallery_normalized"] = "macally-bestbuy-product-only"
        product["main_image_source_url"] = "https://www.bestbuy.com/product/macally-bluetooth-keyboard-and-mouse-for-mac-scissors-wireless-bluetooth-keyboard-110-key-aluminum-wireless-macaron/JXR4WP37HF"
        product["main_image_match_score"] = 100.0
        product["main_image_search_engine"] = "Best Buy exact product SKU"
        changed = True
        updated = True
        print(f"{path.name}: {product['name']} -> {asset}")
    if changed:
        path.write_text(text[:start] + json.dumps(products, ensure_ascii=False, separators=(",", ":")) + text[end + 1:], encoding="utf-8")
if not updated:
    raise SystemExit("Macally product ID 212 was not found")
