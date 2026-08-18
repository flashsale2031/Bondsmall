from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "catalog-pages" / "products-page-00011.js"
PATTERN = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)

text = TARGET.read_text(encoding="utf-8")
match = PATTERN.search(text)
if not match:
    raise SystemExit(f"Could not parse catalog wrapper: {TARGET}")
records = json.loads("[" + match.group(1) + "]")
updated = None
for product in records:
    if product.get("id") != 212:
        continue
    gallery = [
        "assets/jbl-flip6/jbl-flip6-black-front.jpg",
        "assets/jbl-flip6/jbl-flip6-black-angle.jpg",
    ]
    product.update({
        "name": "JBL Flip 6 Portable Waterproof Bluetooth Speaker - Black",
        "category": "electronics",
        "retail price": 129.99,
        "sale price": 89.99,
        "image": gallery[0],
        "description": "JBL Flip 6 portable waterproof Bluetooth speaker in black with 30W two-way sound, IP67 waterproof and dustproof protection, up to 12 hours of playtime, USB-C charging, and JBL PartyBoost speaker pairing.",
        "images": gallery,
        "specifications": {
            "brand": "JBL",
            "model": "JBLFLIP6BLKAM",
            "color": "Black",
            "output_power": "30 W",
            "bluetooth": "Bluetooth 5.1",
            "battery_life": "Up to 12 hours",
            "water_resistance": "IP67 waterproof and dustproof",
            "charging": "USB-C",
            "pairing": "JBL PartyBoost",
        },
        "productType": "Electronics",
        "source_url": "https://www.jbl.com/FLIP-6-.html",
        "main_image_source_url": "https://www.pcrichard.com/jbl-flip-6-portable-rechargeable-waterproof-bluetooth-speaker-black/JBLFLIP6BLKAM.html",
        "main_image_search_engine": "PC Richard product image search",
        "main_image_match_score": 100.0,
        "main_image_match_confidence": "verified-product-gallery",
        "secondary_image_source_url": "https://www.crutchfield.com/p_109FLIP6BK/JBL-Flip-6-Black.html",
        "secondary_image_search_engine": "Crutchfield product image search",
        "secondary_image_match_confidence": "verified-product-gallery",
        "secondary_image_storage": "repository-local",
        "secondary_image_local_path": gallery[1],
        "gallery_normalized": "verified-jbl-flip6-black-gallery",
        "price_currency": "USD",
        "price_is_estimate": False,
        "price_benchmark_method": "Retail list price aligned to JBL official $129.95 list band and sale price aligned to Best Buy's current black-model marketplace range of $84.99-$89.99; values use commercial .99 endings.",
        "price_benchmark_sources": [
            {"retailer": "JBL", "url": "https://www.jbl.com/FLIP-6-.html", "observed_price": "$129.95 list / $114.95 promotional", "role": "official manufacturer price"},
            {"retailer": "Best Buy", "url": "https://www.bestbuy.com/product/jbl-flip6-portable-waterproof-speaker-black/J7LXFW2QJG/sku/11446735", "observed_price": "$89.95; new marketplace $84.99-$89.99", "role": "retailer market benchmark"},
        ],
        "price_benchmark_note": "Replacement product pricing is benchmarked to the official JBL page and corroborated Best Buy listing; rounded to .99 for catalog presentation.",
    })
    updated = product
    break
if updated is None:
    raise SystemExit("Product ID 212 not found")

payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
TARGET.write_text(
    "// Bondsmall page-sized catalog chunk\n"
    "window.products = window.products || [];\n"
    "window.products.push(..." + payload + ");\n",
    encoding="utf-8",
)
report = {
    "replaced_id": 212,
    "old_product": "Macally Bluetooth Keyboard and Mouse",
    "new_product": updated["name"],
    "image": updated["image"],
    "images": updated["images"],
    "retail_price": updated["retail price"],
    "sale_price": updated["sale price"],
    "source": updated["source_url"],
}
(ROOT / "macally-replacement-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
