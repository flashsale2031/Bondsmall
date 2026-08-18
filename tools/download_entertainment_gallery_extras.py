import hashlib
import json
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse
import mimetypes
import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "tmp-entertainment-image-cache"
existing = {}
for line in (ROOT / "entertainment-external-image-downloads.jsonl").read_text(encoding="utf-8").splitlines():
    item = json.loads(line)
    existing[item["url"]] = item
records = [json.loads(line) for line in (ROOT / "entertainment-image-audit.jsonl").read_text(encoding="utf-8").splitlines()]
urls = sorted({value for record in records for value in record.get("images", []) if isinstance(value, str) and value.startswith(("http://", "https://")) and value not in existing})
headers = {"User-Agent": "Mozilla/5.0 Bondsmall product-image audit"}
new = []
for url in urls:
    key = hashlib.sha256(url.encode()).hexdigest()[:24]
    path = CACHE / key
    item = {"url": url, "cache": None, "status": None, "width": None, "height": None, "error": None}
    try:
        response = requests.get(url, headers=headers, timeout=20)
        item["status"] = response.status_code
        response.raise_for_status()
        content_type = response.headers.get("content-type", "")
        image = Image.open(BytesIO(response.content))
        item["width"], item["height"] = image.size
        suffix = mimetypes.guess_extension(content_type.split(";")[0].strip()) or ".jpg"
        final_path = path.with_suffix(suffix)
        final_path.write_bytes(response.content)
        item["cache"] = str(final_path.relative_to(ROOT))
    except Exception as exc:
        item["error"] = str(exc)[:240]
    new.append(item)
with (ROOT / "entertainment-external-image-downloads.jsonl").open("a", encoding="utf-8") as handle:
    for item in new:
        handle.write(json.dumps(item, ensure_ascii=False) + "\n")
print(json.dumps({"new_urls": len(urls), "results": new}, indent=2))
