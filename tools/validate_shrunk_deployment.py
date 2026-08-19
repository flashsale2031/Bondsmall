from __future__ import annotations

import gzip
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path('.')
CATALOG = ROOT / 'catalog-pages'
LOGO = ROOT / 'bonds-mall-logo.png'

manifest = json.loads((CATALOG / 'manifest.json').read_text())
packed = sorted(CATALOG.glob('products-page-*.json.gz'))
source = sorted(CATALOG.glob('products-page-*.js'))
assert manifest['format'] == 'gzip-json-v1'
assert len(packed) == manifest['pages'] == 61577
assert not source, f'unpacked chunks remain: {len(source)}'

sample = packed[0]
with gzip.open(sample, 'rt', encoding='utf-8') as stream:
    records = json.load(stream)
assert len(records) > 0
assert all(isinstance(item, dict) and 'id' in item for item in records)

logo_hash = hashlib.sha256(LOGO.read_bytes()).hexdigest()
expected_logo_hash = subprocess.check_output(['git', 'show', 'HEAD:bonds-mall-logo.png']).strip()
# git show output is binary; compare through a temporary hash calculation in Python below.
expected_logo_hash = hashlib.sha256(subprocess.check_output(['git', 'show', 'HEAD:bonds-mall-logo.png'])).hexdigest()
assert logo_hash == expected_logo_hash, 'logo bytes changed'

with Image.open(LOGO) as image:
    logo_size = image.size

catalog_bytes = sum(path.stat().st_size for path in packed)
asset_bytes = sum(path.stat().st_size for path in (ROOT / 'assets').rglob('*') if path.is_file())
print(json.dumps({
    'manifest': manifest,
    'packed_files': len(packed),
    'sample_records': len(records),
    'catalog_packed_bytes': catalog_bytes,
    'assets_bytes': asset_bytes,
    'logo_sha256': logo_hash,
    'logo_dimensions': logo_size,
    'logo_preserved': True,
}, indent=2))
