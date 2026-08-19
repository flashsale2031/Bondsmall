from __future__ import annotations

import gzip
import json
import re
from pathlib import Path

ROOT = Path('.')
ASSET_RE = re.compile(r'(?P<path>(?:/)?assets/[^\s"\'()<>?#]+\.(?:jpg|jpeg|png|webp))', re.IGNORECASE)
used = set()
for path in (ROOT / 'catalog-pages').glob('products-page-*.json.gz'):
    with gzip.open(path, 'rt', encoding='utf-8') as stream:
        text = stream.read()
    used.update(match.group('path').lstrip('/') for match in ASSET_RE.finditer(text))
for path in ROOT.rglob('*'):
    if not path.is_file() or '.git' in path.parts or path.suffix.lower() not in {'.html','.js','.css','.json','.jsonl','.xml','.txt','.md','.py'}:
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except (UnicodeDecodeError, OSError):
        continue
    used.update(match.group('path').lstrip('/') for match in ASSET_RE.finditer(text))
all_assets = {path.relative_to(ROOT).as_posix(): path for path in (ROOT / 'assets').rglob('*') if path.is_file()}
unused = [path for path in all_assets if path not in used]
used_bytes = sum(all_assets[path].stat().st_size for path in all_assets if path in used)
unused_bytes = sum(all_assets[path].stat().st_size for path in unused)
print({'all_assets': len(all_assets), 'used_assets': len(all_assets)-len(unused), 'unused_assets': len(unused), 'used_bytes': used_bytes, 'unused_bytes': unused_bytes})
Path('/tmp/bondsmall_unused_assets.txt').write_text('\n'.join(sorted(unused)) + '\n')
