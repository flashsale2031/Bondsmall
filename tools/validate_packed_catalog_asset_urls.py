from __future__ import annotations

import gzip
import json
import re
from pathlib import Path

ROOT = Path('.')
URL_RE = re.compile(r'(?:^|["\'])((?:/)?assets/[^"\']+)(?:["\']|$)')
missing = []
local_count = 0
for path in sorted((ROOT / 'catalog-pages').glob('products-page-*.json.gz')):
    with gzip.open(path, 'rt', encoding='utf-8') as stream:
        text = json.dumps(json.load(stream), ensure_ascii=False, separators=(',', ':'))
    for match in URL_RE.finditer(text):
        url = match.group(1)
        if '?' in url:
            url = url.split('?', 1)[0]
        local_count += 1
        if not (ROOT / url.lstrip('/')).is_file():
            missing.append((path.name, url))
            if len(missing) >= 20:
                break
    if len(missing) >= 20:
        break
assert not missing, missing
print({'local_asset_urls_checked': local_count, 'missing': 0})
