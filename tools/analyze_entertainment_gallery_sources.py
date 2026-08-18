import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
records = [json.loads(line) for line in (ROOT / "entertainment-image-audit.jsonl").read_text(encoding="utf-8").splitlines()]
urls = []
for record in records:
    for value in record.get("images", []):
        if isinstance(value, str) and value.startswith(("http://", "https://")):
            urls.append(value)
print(json.dumps({"gallery_url_count": len(urls), "unique_gallery_urls": len(set(urls)), "domains": Counter(urlparse(url).netloc.lower() for url in urls).most_common(20)}, indent=2))
