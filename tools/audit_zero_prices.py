import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAT = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)
zeros = []
for path in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
    match = PAT.search(path.read_text(encoding="utf-8"))
    if not match:
        continue
    try:
        products = json.loads("[" + match.group(1) + "]")
    except Exception:
        continue
    for product in products:
        def number(key):
            try:
                return float(product.get(key))
            except (TypeError, ValueError):
                return None
        retail = number("retail price")
        sale = number("sale price")
        if retail is None or sale is None or retail <= 0 or sale <= 0:
            zeros.append({
                "id": int(product.get("id", 0)),
                "name": product.get("name", ""),
                "category": product.get("category", "Unknown"),
                "brand": (product.get("specifications") or {}).get("brand", "Unknown"),
                "retail_price": retail,
                "sale_price": sale,
                "chunk": str(path.relative_to(ROOT)),
            })
report = {
    "zero_or_invalid_count": len(zeros),
    "by_category": Counter(row["category"] for row in zeros),
    "sample": zeros[:100],
    "records": zeros,
}
(ROOT / "zero-price-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"zero_or_invalid_count": len(zeros), "by_category": dict(report["by_category"])}))
