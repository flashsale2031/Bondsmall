import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
records = [json.loads(line) for line in (ROOT / "entertainment-image-audit.jsonl").read_text(encoding="utf-8").splitlines()]
downloads = {json.loads(line)["url"]: json.loads(line) for line in (ROOT / "entertainment-external-image-downloads.jsonl").read_text(encoding="utf-8").splitlines()}
seen = set()
for record in records:
    url = record.get("image")
    if not isinstance(url, str) or "amazon" not in url or url in seen:
        continue
    seen.add(url)
    item = downloads.get(url, {})
    if int(item.get("width") or 99999) >= 500 and int(item.get("height") or 99999) >= 500:
        continue
    match = re.search(r"(https?://[^/]+/images/I/[^?]+?)(?:\._[^/?]+)?(\.[A-Za-z0-9]+)(?:\?.*)?$", url)
    canonical = (match.group(1) + match.group(2)) if match else None
    print(json.dumps({"id": record.get("id"), "name": record.get("name"), "current": url, "current_dimensions": [item.get("width"), item.get("height")], "canonical": canonical}, ensure_ascii=False))
    if len(seen) >= 100:
        break
