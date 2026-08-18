import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
records = [json.loads(line) for line in (ROOT / "entertainment-image-audit.jsonl").read_text(encoding="utf-8").splitlines()]
main_urls = [r["image"] for r in records if isinstance(r.get("image"), str) and r["image"].startswith(("http://", "https://"))]
domains = Counter(urlparse(url).netloc.lower() for url in main_urls)
print(json.dumps({"records": len(records), "unique_main_urls": len(set(main_urls)), "domains": domains.most_common(30)}, indent=2, default=int))
