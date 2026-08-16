import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAT = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)

# Prices are benchmark-based, not fabricated claims about a seller's current checkout.
# Only records with product-specific source evidence are included.
PRICING = {
    182: {
        "retail_price": 89.99,
        "sale_price": 59.99,
        "currency": "USD",
        "method": "Retail benchmark near the verified luxury/independent-maker source band ($90-$99); sale benchmark below that band and above the lowest generic window-decor comparables.",
        "luxury_sources": [
            {"url": "https://www.uncommongoods.com/product/everlasting-stained-glass-orchid", "observed_range": "$90-$99", "product_specific": True},
            {"url": "https://www.etsy.com/market/3d_stained_glass_orchid", "observed_range": "$59-$199", "product_specific": False},
        ],
        "generic_sources": [
            {"url": "https://www.walmart.com/c/kp/stained-glass-orchid-decor", "observed_range": "$17.81-$34.04+", "product_specific": False},
            {"url": "https://www.etsy.com/market/3d_stained_glass_orchid", "observed_range": "$19.05-$78+", "product_specific": False},
        ],
        "note": "The source product is a three-dimensional stained-glass orchid sculpture; generic suncatchers and wall panels were used only as lower-tier market comparables, not as exact matches."
    }
}

updated = []
for path in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
    match = PAT.search(path.read_text(encoding="utf-8"))
    if not match:
        continue
    records = json.loads("[" + match.group(1) + "]")
    dirty = False
    for product in records:
        pid = int(product.get("id", 0))
        spec = PRICING.get(pid)
        if not spec:
            continue
        product["retail price"] = spec["retail_price"]
        product["sale price"] = spec["sale_price"]
        product["price_currency"] = spec["currency"]
        product["price_benchmark_method"] = spec["method"]
        product["price_benchmark_sources"] = spec["luxury_sources"] + spec["generic_sources"]
        product["price_benchmark_note"] = spec["note"]
        updated.append({"id": pid, "retail_price": spec["retail_price"], "sale_price": spec["sale_price"]})
        dirty = True
    if dirty:
        payload = json.dumps(records, ensure_ascii=False, separators=(",", ":"))
        path.write_text("// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(..." + payload + ");\n", encoding="utf-8")

(ROOT / "benchmark-pricing-apply-report.json").write_text(json.dumps({"updated": updated, "policy": "Luxury-to-generic benchmark band; retail near prevailing source price, sale lower only with supporting lower-tier evidence."}, indent=2, ensure_ascii=False), encoding="utf-8")
print(json.dumps({"updated": updated}))
