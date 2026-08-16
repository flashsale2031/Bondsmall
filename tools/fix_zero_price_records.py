import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAT = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)
TARGET = 23
UPDATED = {"retail price": 1999.99, "sale price": 499.99}
SOURCES = [
    {"url": "https://www.apple.com/shop/refurbished/mac/macbook-pro", "observed": "$1,699-$1,999", "type": "manufacturer/refurbished"},
    {"url": "https://www.backmarket.com/en-us/p/macbook-pro-2018-intel", "observed": "$299 refurbished", "type": "refurbished comparable"},
    {"url": "https://www.ebay.com/b/2018-Apple-MacBook-Pro-Laptops/111422/bn_108862120", "observed": "about $249-$645 used/refurbished", "type": "marketplace comparable"},
]
updated = []
for path in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
    match = PAT.search(path.read_text(encoding="utf-8"))
    if not match:
        continue
    products = json.loads("[" + match.group(1) + "]")
    dirty = False
    for product in products:
        if int(product.get("id", 0)) != TARGET:
            continue
        product["retail price"] = UPDATED["retail price"]
        product["sale price"] = UPDATED["sale price"]
        product["price_currency"] = "USD"
        product["price_is_zero_correction"] = True
        product["price_estimate_type"] = "similar-refurbished-product-category-baseline"
        product["price_estimate_sources"] = SOURCES
        product["price_estimate_note"] = "Corrected missing sale price using comparable 2018 15-inch MacBook Pro refurbished/used listings; retail price preserved at the existing nonzero value."
        updated.append({"id": TARGET, "retail_price": UPDATED["retail price"], "sale_price": UPDATED["sale price"], "sources": SOURCES})
        dirty = True
    if dirty:
        payload = json.dumps(products, ensure_ascii=False, separators=(",", ":"))
        path.write_text("// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(..." + payload + ");\n", encoding="utf-8")
(ROOT / "zero-price-correction-report.json").write_text(json.dumps({"updated": updated, "policy": "No product may remain at $0.00; nonzero comparable price required."}, indent=2), encoding="utf-8")
print(json.dumps({"updated": updated}))
