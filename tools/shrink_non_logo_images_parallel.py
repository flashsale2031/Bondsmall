from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path('.')
PROTECTED = {'bonds-mall-logo.png'}
EXTENSIONS = {'.jpg', '.jpeg', '.png'}
TEXT_EXTENSIONS = {'.html', '.htm', '.js', '.css', '.json', '.jsonl', '.xml', '.txt', '.md', '.py', '.yml', '.yaml', '.csv'}


def convert(path: Path):
    if path.name in PROTECTED or path.suffix.lower() not in EXTENSIONS:
        return None
    target = path.with_suffix('.webp')
    temp = target.with_name(target.name + '.tmp')
    try:
        with Image.open(path) as source:
            image = source.convert('RGBA' if 'A' in source.getbands() else 'RGB')
            image.save(temp, 'WEBP', quality=78, method=5)
        before = path.stat().st_size
        after = temp.stat().st_size
        if after >= before:
            temp.unlink(missing_ok=True)
            return None
        temp.replace(target)
        path.unlink()
        return path.relative_to(ROOT).as_posix(), target.relative_to(ROOT).as_posix(), before, after
    except Exception:
        temp.unlink(missing_ok=True)
        return None


def main():
    paths = [p for p in (ROOT / 'assets').rglob('*') if p.is_file() and p.suffix.lower() in EXTENSIONS and p.name not in PROTECTED]
    converted = []
    with ThreadPoolExecutor(max_workers=min(12, os.cpu_count() or 4)) as pool:
        for result in pool.map(convert, paths):
            if result:
                converted.append(result)
    replacements = {old: new for old, new, _, _ in converted}
    replacements.update({f'/{old}': f'/{new}' for old, new, _, _ in converted})
    changed_files = 0
    reference_count = 0
    for path in ROOT.rglob('*'):
        if not path.is_file() or '.git' in path.parts or path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        try:
            text = path.read_text(encoding='utf-8')
        except (UnicodeDecodeError, OSError):
            continue
        updated = text
        for old, new in replacements.items():
            hits = updated.count(old)
            if hits:
                updated = updated.replace(old, new)
                reference_count += hits
        if updated != text:
            path.write_text(updated, encoding='utf-8', newline='')
            changed_files += 1
    before = sum(item[2] for item in converted)
    after = sum(item[3] for item in converted)
    print({'candidate_images': len(paths), 'converted': len(converted), 'bytes_before': before, 'bytes_after': after, 'bytes_saved': before-after, 'reference_files_changed': changed_files, 'references_updated': reference_count})


if __name__ == '__main__':
    main()
