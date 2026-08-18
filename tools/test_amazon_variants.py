import json
import re
from io import BytesIO
from pathlib import Path
import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
records = [json.loads(line) for line in (ROOT / "entertainment-image-audit.jsonl").read_text(encoding="utf-8").splitlines()]
downloads = {json.loads(line)["url"]: json.loads(line) for line in (ROOT / "entertainment-external-image-downloads.jsonl").read_text(encoding="utf-8").splitlines()}
seen = 0
for record in records:
    url = record.get("image")
    item = downloads.get(url, {})
    if not isinstance(url, str) or "amazon" not in url or int(item.get("width") or 99999) >= 500:
        continue
    match = re.search(r"/images/I/([^.?]+)(?:\.[A-Za-z0-9]+)?", url)
    if not match:
        continue
    stem = match.group(1)
    variants = [
        f"https://m.media-amazon.com/images/I/{stem}._AC_SL1500_.jpg",
        f"https://m.media-amazon.com/images/I/{stem}.jpg",
    ]
    result = {"id": record.get("id"), "name": record.get("name"), "old": [item.get("width"), item.get("height")], "variants": []}
    for variant in variants:
        try:
            response = requests.get(variant, timeout=12, headers={"User-Agent": "Mozilla/5.0"})
            image = Image.open(BytesIO(response.content))
            result["variants"].append({"url": variant, "status": response.status_code, "dimensions": list(image.size)})
        except Exception as exc:
            result["variants"].append({"url": variant, "error": str(exc)[:100]})
    print(json.dumps(result, ensure_ascii=False))
    seen += 1
    if seen >= 20:
        break
