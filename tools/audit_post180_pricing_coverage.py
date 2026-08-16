import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAT = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)
rows = []
for path in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
    text = path.read_text(encoding="utf-8")
    match = PAT.search(text)
    if not match:
        continue
    try:
        products = json.loads("[" + match.group(1) + "]")
    except Exception:
        continue
    for product in products:
        if int(product.get("id", 0)) <= 180:
            continue
        retail = product.get("retail price")
        sale = product.get("sale price")
        try:
            retail_num = float(retail)
            sale_num = float(sale)
        except (TypeError, ValueError):
            retail_num = sale_num = None
        rows.append({
            "id": int(product["id"]),
            "name": product.get("name", ""),
            "category": product.get("category", "Unknown"),
            "brand": (product.get("specifications") or {}).get("brand", "Unknown"),
            "retail_price": retail_num,
            "sale_price": sale_num,
            "source_url": product.get("source_url", ""),
            "has_source": bool(product.get("source_url") or product.get("image_source_url")),
            "price_benchmark_method": product.get("price_benchmark_method", ""),
        })

report = {
    "policy": "Luxury-to-generic comparable range baseline; generated prices use $.99 endings; insufficient evidence retains current price.",
    "post180_count": len(rows),
    "with_source_url": sum(row["has_source"] for row in rows),
    "with_numeric_prices": sum(row["retail_price"] is not None and row["sale_price"] is not None for row in rows),
    "with_benchmark_metadata": sum(bool(row["price_benchmark_method"]) for row in rows),
    "missing_or_invalid_prices": sum(row["retail_price"] is None or row["sale_price"] is None for row in rows),
    "categories": Counter(row["category"] for row in rows),
    "top_brands": Counter(row["brand"] for row in rows).most_common(50),
    "sample_first_50": rows[:50],
}
(ROOT / "post180-pricing-coverage-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({k: report[k] for k in ["post180_count", "with_source_url", "with_numeric_prices", "with_benchmark_metadata", "missing_or_invalid_prices"]}, indent=2))
