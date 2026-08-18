import json
from collections import Counter
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
results = {}
for line in (ROOT / "entertainment-external-image-downloads.jsonl").read_text(encoding="utf-8").splitlines():
    item = json.loads(line)
    results[item["url"]] = item
records = [json.loads(line) for line in (ROOT / "entertainment-image-audit.jsonl").read_text(encoding="utf-8").splitlines()]
summary = Counter()
risky = []
for record in records:
    url = record.get("image")
    item = results.get(url, {})
    if url and url.startswith(("http://", "https://")):
        if item.get("error") or not item.get("cache"):
            summary["download-failed"] += 1
            risky.append({**record, "cache_status": item})
            continue
        summary["downloaded"] += 1
        w, h = item.get("width"), item.get("height")
        if not w or not h:
            summary["no-dimensions"] += 1
            continue
        ratio = w / h
        if min(w, h) < 500:
            summary["low-resolution"] += 1
        if ratio > 1.55 or ratio < 0.67:
            summary["extreme-aspect"] += 1
        cache_path = ROOT / item["cache"]
        try:
            with Image.open(cache_path).convert("RGB") as image:
                sample = image.resize((32, 32))
                pixels = list(sample.getdata())
                border = pixels[:32] + pixels[-32:] + pixels[::32] + pixels[31::32]
                light = sum(1 for r, g, b in border if r > 235 and g > 235 and b > 235) / max(1, len(border))
                if light < 0.18:
                    summary["non-white-border-risk"] += 1
                if light < 0.18 or ratio > 1.55 or ratio < 0.67 or min(w, h) < 500:
                    risky.append({**record, "cache_status": item, "border_light_fraction": round(light, 3)})
        except Exception:
            summary["cache-unreadable"] += 1
    else:
        summary["local-or-missing"] += 1
print(json.dumps({"records": len(records), "summary": summary, "risky_records": len(risky)}, indent=2, default=int))
(ROOT / "entertainment-cached-risk-records.jsonl").write_text("".join(json.dumps(x, ensure_ascii=False) + "\n" for x in risky), encoding="utf-8")
