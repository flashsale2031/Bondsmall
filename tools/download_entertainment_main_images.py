import concurrent.futures
import hashlib
import json
import mimetypes
import re
from pathlib import Path
from urllib.parse import urlparse

import requests
from PIL import Image
from io import BytesIO

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "tmp-entertainment-image-cache"
CACHE.mkdir(exist_ok=True)
records = [json.loads(line) for line in (ROOT / "entertainment-image-audit.jsonl").read_text(encoding="utf-8").splitlines()]
urls = sorted({r["image"] for r in records if isinstance(r.get("image"), str) and r["image"].startswith(("http://", "https://"))})
headers = {"User-Agent": "Mozilla/5.0 Bondsmall product-image audit"}

def fetch(url):
    key = hashlib.sha256(url.encode()).hexdigest()[:24]
    path = CACHE / key
    result = {"url": url, "cache": str(path.relative_to(ROOT)), "status": None, "width": None, "height": None, "error": None}
    try:
        response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        result["status"] = response.status_code
        response.raise_for_status()
        content_type = response.headers.get("content-type", "")
        if "image" not in content_type and not response.content.startswith(b"\xff\xd8"):
            raise ValueError(f"not-an-image:{content_type}")
        image = Image.open(BytesIO(response.content))
        result["width"], result["height"] = image.size
        suffix = mimetypes.guess_extension(content_type.split(";")[0].strip()) or ".jpg"
        final_path = path.with_suffix(suffix)
        final_path.write_bytes(response.content)
        result["cache"] = str(final_path.relative_to(ROOT))
    except Exception as exc:
        result["error"] = str(exc)[:240]
    return result

out = ROOT / "entertainment-external-image-downloads.jsonl"
with out.open("w", encoding="utf-8") as handle:
    with concurrent.futures.ThreadPoolExecutor(max_workers=48) as executor:
        for index, result in enumerate(executor.map(fetch, urls), 1):
            handle.write(json.dumps(result, ensure_ascii=False) + "\n")
            if index % 500 == 0:
                print(f"processed {index}/{len(urls)}", flush=True)
print(f"completed {len(urls)} unique URLs")
