from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path('assets')
PROTECTED = {'bonds-mall-logo.png'}

def recompress(path: Path):
    if path.name in PROTECTED or path.suffix.lower() != '.webp':
        return None
    temp = path.with_name(path.name + '.repack.tmp')
    try:
        with Image.open(path) as source:
            image = source.convert('RGBA' if 'A' in source.getbands() else 'RGB')
            image.save(temp, 'WEBP', quality=40, method=4)
        before = path.stat().st_size
        after = temp.stat().st_size
        if after >= before:
            temp.unlink(missing_ok=True)
            return None
        temp.replace(path)
        return before, after
    except Exception:
        temp.unlink(missing_ok=True)
        return None

paths = [p for p in ROOT.rglob('*.webp') if p.name not in PROTECTED]
with ThreadPoolExecutor(max_workers=min(12, os.cpu_count() or 4)) as pool:
    results = [result for result in pool.map(recompress, paths) if result]
print({'candidates': len(paths), 'recompressed': len(results), 'bytes_before': sum(x[0] for x in results), 'bytes_after': sum(x[1] for x in results), 'bytes_saved': sum(x[0]-x[1] for x in results)})
