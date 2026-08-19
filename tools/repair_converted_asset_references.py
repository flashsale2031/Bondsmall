from pathlib import Path

ROOT = Path('.')
TEXT_EXTENSIONS = {'.html', '.htm', '.js', '.css', '.json', '.jsonl', '.xml', '.txt', '.md', '.py', '.yml', '.yaml', '.csv'}
replacements = {}
for path in (ROOT / 'assets').rglob('*'):
    if not path.is_file() or path.suffix.lower() not in {'.webp'}:
        continue
    original_jpg = path.with_suffix('.jpg')
    original_jpeg = path.with_suffix('.jpeg')
    original_png = path.with_suffix('.png')
    for original in (original_jpg, original_jpeg, original_png):
        if not original.exists():
            old = original.relative_to(ROOT).as_posix()
            new = path.relative_to(ROOT).as_posix()
            replacements[old] = new
            replacements['/' + old] = '/' + new
            break
changed = references = 0
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
            references += hits
    if updated != text:
        path.write_text(updated, encoding='utf-8', newline='')
        changed += 1
print({'existing_webp_assets': len(replacements)//2, 'reference_files_changed': changed, 'references_updated': references})
