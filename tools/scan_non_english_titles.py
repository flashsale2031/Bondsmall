import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAT = re.compile(r"window\.products\.push\(\.\.\[(.*)\]\);?", re.S)
SCRIPT_PATTERNS = {
    "CJK": re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]"),
    "Japanese": re.compile(r"[\u3040-\u30ff]"),
    "Korean": re.compile(r"[\uac00-\ud7af]"),
    "Cyrillic": re.compile(r"[\u0400-\u052f]"),
    "Arabic": re.compile(r"[\u0600-\u06ff\u0750-\u077f]"),
    "Devanagari": re.compile(r"[\u0900-\u097f]"),
    "Greek": re.compile(r"[\u0370-\u03ff]"),
    "Hebrew": re.compile(r"[\u0590-\u05ff]"),
    "Thai": re.compile(r"[\u0e00-\u0e7f]"),
    "Vietnamese": re.compile(r"[ăâđêôơưĂÂĐÊÔƠƯ]"),
}

def load_records():
    for path in sorted((ROOT / "catalog-pages").glob("products-page-*.js")):
        text = path.read_text(encoding="utf-8")
        match = PAT.search(text)
        if not match:
            continue
        try:
            records = json.loads("[" + match.group(1) + "]")
        except Exception:
            continue
        for record in records:
            if int(record.get("id", 0)) > 180:
                yield path, record

rows = []
counts = {key: 0 for key in SCRIPT_PATTERNS}
for path, record in load_records():
    name = str(record.get("name", ""))
    scripts = [key for key, pattern in SCRIPT_PATTERNS.items() if pattern.search(name)]
    if scripts:
        for key in scripts:
            counts[key] += 1
        rows.append({
            "id": int(record.get("id", 0)),
            "chunk": str(path.relative_to(ROOT)),
            "name": name,
            "brand": str((record.get("specifications") or {}).get("brand", "")),
            "source_url": record.get("source_url", ""),
            "scripts": scripts,
        })

out = {
    "scope": "post-180",
    "candidate_count": len(rows),
    "script_counts": counts,
    "candidates": rows,
}
(ROOT / "non-english-title-queue.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"candidate_count": len(rows), "script_counts": counts}, ensure_ascii=False))
