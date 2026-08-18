from pathlib import Path
from collections import Counter
import json, re

ROOT = Path(__file__).resolve().parents[1]
PATTERN = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)
position = 0
products = []
for path in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
    match = PATTERN.search(path.read_text(encoding="utf-8"))
    if not match:
        continue
    records = json.loads("[" + match.group(1) + "]")
    for product in records:
        position += 1
        product = dict(product)
        product["_position"] = position
        product["_source_file"] = path.name
        products.append(product)

post = [p for p in products if p["_position"] > 159]
for field in ("retail price", "sale price"):
    values = [p.get(field) for p in post]
    counts = Counter(values)
    print(f"{field}: {len(values):,} records, {len(counts):,} distinct values")
    print("top_values:", counts.most_common(20))
    print("integer_count:", sum(isinstance(v, (int, float)) and float(v).is_integer() for v in values))
    print("missing_or_invalid:", sum(not isinstance(v, (int, float)) or float(v) <= 0 for v in values))

print("total_records:", len(products))
print("post159_records:", len(post))
print("sample_boundary:")
for p in products[154:164]:
    print(json.dumps({k: p.get(k) for k in ("_position", "id", "name", "retail price", "sale price", "price_pending", "price_is_estimate", "price_benchmark_sources")}, ensure_ascii=False)[:1200])

fields = Counter()
for p in post:
    for key in p:
        if "price" in key.lower() or "retail" in key.lower() or "compet" in key.lower():
            fields[key] += 1
print("pricing_evidence_fields:", fields)
print("git_status:")
print((ROOT / ".git").exists())
if (ROOT / ".git").exists():
    import subprocess
    print(subprocess.check_output(["git", "status", "--short"], cwd=ROOT, text=True))

# Save compact machine-readable summary for later phases.
summary = {
    "total_records": len(products),
    "post159_records": len(post),
    "boundary": [{k: p.get(k) for k in ("_position", "id", "name", "retail price", "sale price", "price_pending", "price_is_estimate")} for p in products[154:164]],
    "price_fields": {field: {"distinct": len(Counter(p.get(field) for p in post)), "integer_count": sum(isinstance(p.get(field), (int, float)) and float(p.get(field)).is_integer() for p in post)} for field in ("retail price", "sale price")},
    "evidence_fields": dict(fields),
}
(ROOT / "post159-pricing-inspection.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("saved: post159-pricing-inspection.json")
