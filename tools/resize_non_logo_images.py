from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path('assets')
MAX_EDGE = 400

def process(path: Path):
    if path.name == 'bonds-mall-logo.png' or path.suffix.lower() != '.webp':
        return None
    temp = path.with_name(path.name + '.resize.tmp')
    try:
        with Image.open(path) as source:
            image = source.convert('RGBA' if 'A' in source.getbands() else 'RGB')
            if max(image.size) > MAX_EDGE:
                scale = MAX_EDGE / max(image.size)
                image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
            image.save(temp, 'WEBP', quality=35, method=4)
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

paths = [p for p in ROOT.rglob('*.webp') if p.name != 'bonds-mall-logo.png']
with ThreadPoolExecutor(max_workers=min(12, os.cpu_count() or 4)) as pool:
    results = [result for result in pool.map(process, paths) if result]
print({'candidates': len(paths), 'resized_or_recompressed': len(results), 'bytes_before': sum(x[0] for x in results), 'bytes_after': sum(x[1] for x in results), 'bytes_saved': sum(x[0]-x[1] for x in results)})
