from __future__ import annotations

import re
from pathlib import Path

ROOT = Path('.')
TEXT_EXTENSIONS = {'.html', '.htm', '.js', '.css', '.json', '.jsonl', '.xml', '.txt', '.md', '.py', '.yml', '.yaml', '.csv'}
ASSET_RE = re.compile(r'(?P<prefix>(?:/)?assets/[^\s"\'()<>]+?)(?P<ext>\.(?:jpg|jpeg|png))(?P<suffix>(?:[?#][^\s"\'()<>]*)?)', re.IGNORECASE)


def replace(match: re.Match[str]) -> str:
    prefix = match.group('prefix')
    ext = match.group('ext')
    suffix = match.group('suffix')
    candidate = ROOT / (prefix.lstrip('/') + '.webp')
    if candidate.exists() and candidate.name != 'bonds-mall-logo.webp':
        return prefix + '.webp' + suffix
    return match.group(0)

changed = references = 0
for path in ROOT.rglob('*'):
    if not path.is_file() or '.git' in path.parts or path.suffix.lower() not in TEXT_EXTENSIONS:
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except (UnicodeDecodeError, OSError):
        continue
    updated, count = ASSET_RE.subn(replace, text)
    if updated != text:
        path.write_text(updated, encoding='utf-8', newline='')
        changed += 1
        references += count
print({'reference_files_changed': changed, 'references_scanned_or_updated': references})
