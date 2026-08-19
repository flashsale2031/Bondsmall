from __future__ import annotations
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT_COMMIT = 'daf7d0a2fa^'
source = subprocess.check_output(['git', 'show', f'{SNAPSHOT_COMMIT}:products.js'], cwd=ROOT, text=True)
start = source.index('[')
records = json.loads(source[start:].rstrip().removesuffix(';'))
assert len(records) >= 155
records = [item for item in records if 1 <= int(item['id']) <= 155]
ids = [int(item['id']) for item in records]
assert ids == [item for item in range(1, 156) if item != 102]
out = 'var products = ' + json.dumps(records, ensure_ascii=False, indent=2) + ';\n'
(ROOT / 'products.js').write_text(out, encoding='utf-8')
print(f'restored {len(records)} authoritative products into products.js')
