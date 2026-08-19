from __future__ import annotations

import gzip
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path('.')
ASSET_RE = re.compile(r'(?P<prefix>(?:/)?assets/[^\s"\'()<>]+?)(?P<ext>\.(?:jpg|jpeg|png))(?P<suffix>(?:[?#][^\s"\'()<>]*)?)', re.IGNORECASE)

def replace(match: re.Match[str]) -> str:
    prefix = match.group('prefix')
    suffix = match.group('suffix')
    candidate = ROOT / (prefix.lstrip('/') + '.webp')
    if candidate.exists() and candidate.name != 'bonds-mall-logo.webp':
        return prefix + '.webp' + suffix
    return match.group(0)

def update(path: Path):
    with gzip.open(path, 'rt', encoding='utf-8') as stream:
        records = json.load(stream)
    raw = json.dumps(records, ensure_ascii=False, separators=(',', ':'))
    updated, count = ASSET_RE.subn(replace, raw)
    if updated != raw:
        records = json.loads(updated)
        temp = path.with_name(path.name + '.tmp')
        with temp.open('wb') as raw_file:
            with gzip.GzipFile(fileobj=raw_file, mode='wb', compresslevel=9, mtime=0) as stream:
                stream.write(json.dumps(records, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))
        temp.replace(path)
    return count

paths = sorted((ROOT / 'catalog-pages').glob('products-page-*.json.gz'))
with ThreadPoolExecutor(max_workers=8) as pool:
    counts = list(pool.map(update, paths))
print({'chunks': len(paths), 'references_updated': sum(counts), 'chunks_changed': sum(1 for count in counts if count)})
