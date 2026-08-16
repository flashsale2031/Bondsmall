import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAT = re.compile(r"window\.products\.push\(\.\.\.\[(.*)\]\);\s*$", re.S)

manifests = []
for filename, source_kind in [
    ("exact-manufacturer-gallery-results.json", "manufacturer"),
    ("additional-official-gallery-results.json", "manufacturer"),
]:
    path = ROOT / filename
    if not path.exists():
        continue
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = data if isinstance(data, list) else [dict(value, id=int(key)) for key, value in data.items()]
    for row in rows:
        gallery = row.get("gallery") or []
        if len(gallery) >= 2:
            manifests.append({
                "id": int(row["id"]),
                "source_kind": source_kind,
                "source_url": row.get("manufacturer_url", ""),
                "candidate_name": row.get("name", row.get("original_name", "")),
                "gallery_count": len(gallery),
                "tier": min(5, len(gallery)),
                "gallery": gallery,
            })

catalog = {}
for path in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
    match = PAT.search(path.read_text(encoding="utf-8"))
    if not match:
        continue
    try:
        records = json.loads("[" + match.group(1) + "]")
    except Exception:
        continue
    for record in records:
        if int(record.get("id", 0)) > 180:
            catalog[int(record["id"])] = {
                "name": record.get("name", ""),
                "image_count": len(record.get("images") or []),
                "source": record.get("image_source_url", record.get("source_url", "")),
            }

rows = []
for candidate in manifests:
    live = catalog.get(candidate["id"], {})
    candidate["live_name"] = live.get("name", "")
    candidate["live_image_count"] = live.get("image_count", 0)
    candidate["applied"] = candidate["live_image_count"] >= 2
    rows.append(candidate)

rows.sort(key=lambda row: (-row["tier"], row["id"]))
summary = {
    "policy": "5+ images preferred, then 4, 3, 2; retain original if no valid two-image source exists",
    "candidate_count": len(rows),
    "tiers": {str(tier): sum(row["tier"] == tier for row in rows) for tier in range(5, 1, -1)},
    "applied_candidate_count": sum(row["applied"] for row in rows),
    "candidates": rows,
}
(ROOT / "gallery-tier-policy-audit.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"candidate_count": summary["candidate_count"], "tiers": summary["tiers"], "applied_candidate_count": summary["applied_candidate_count"]}))
