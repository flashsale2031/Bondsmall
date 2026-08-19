from __future__ import annotations

import argparse
import gzip
import json
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

PREFIX = '// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(...'
SUFFIX = ');\n'


def pack_one(path: Path, remove_source: bool) -> tuple[int, int, int, str]:
    text = path.read_text(encoding='utf-8')
    if 'window.products.push(...' not in text:
        raise ValueError(f'Unexpected catalog chunk format: {path}')
    start = text.index('window.products.push(...') + len('window.products.push(...')
    payload = text[start:]
    if payload.endswith(SUFFIX):
        payload = payload[:-len(SUFFIX)]
    elif payload.endswith(');'):
        payload = payload[:-2]
    else:
        raise ValueError(f'Unexpected catalog chunk suffix: {path}')
    records = json.loads(payload)
    if not isinstance(records, list) or not records:
        raise ValueError(f'Empty or invalid records in {path}')
    compact = json.dumps(records, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    target = path.with_suffix('.json.gz')
    temp = target.with_name(target.name + '.tmp')
    with temp.open('wb') as raw:
        with gzip.GzipFile(fileobj=raw, mode='wb', compresslevel=9, mtime=0) as stream:
            stream.write(compact)
    before = path.stat().st_size
    after = temp.stat().st_size
    temp.replace(target)
    if remove_source:
        path.unlink()
    return before, after, len(records), path.name


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path('catalog-pages'))
    parser.add_argument('--workers', type=int, default=min(6, os.cpu_count() or 2))
    parser.add_argument('--keep-source', action='store_true')
    args = parser.parse_args()
    paths = sorted(args.root.glob('products-page-*.js'))
    if not paths:
        raise SystemExit('No unpacked catalog page chunks found')
    total_before = total_after = total_records = 0
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        for before, after, records, name in pool.map(lambda p: pack_one(p, not args.keep_source), paths):
            total_before += before
            total_after += after
            total_records += records
            print(f'{name}: {before} -> {after} bytes ({records} records)', flush=True)
    manifest = {
        'format': 'gzip-json-v1',
        'pageSize': 20,
        'pages': len(paths),
        'records': total_records,
        'sourceBytes': total_before,
        'packedBytes': total_after,
    }
    (args.root / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(manifest))


if __name__ == '__main__':
    main()
