import json
import re
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAT = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)
chunks = defaultdict(set)
counts = Counter()
for path in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
    match = PAT.search(path.read_text(encoding="utf-8"))
    if not match:
        continue
    products = json.loads("[" + match.group(1) + "]")
    index = int(path.stem.rsplit("-", 1)[-1]) - 1
    for product in products:
        category = str(product.get("category") or "").strip().lower()
        if not category:
            continue
        chunks[category].add(index)
        counts[category] += 1
payload = {
    "version": "1.0.0",
    "totalRecords": sum(counts.values()),
    "categories": {key: {"count": counts[key], "chunks": sorted(values)} for key, values in sorted(chunks.items())},
}
(ROOT / "catalog-category-index.js").write_text("window.BondsmallCategoryIndex = " + json.dumps(payload, separators=(",", ":")) + ";\n", encoding="utf-8")
(ROOT / "catalog-category-index-report.json").write_text(json.dumps({"totalRecords": payload["totalRecords"], "categories": {k: {"count": v["count"], "chunkCount": len(v["chunks"])} for k, v in payload["categories"].items()}}, indent=2), encoding="utf-8")
print(json.dumps({"totalRecords": payload["totalRecords"], "categories": {k: {"count": v["count"], "chunkCount": len(v["chunks"])} for k, v in payload["categories"].items()}}, indent=2))
