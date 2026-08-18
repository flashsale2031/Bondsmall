from pathlib import Path

root = Path('.')
changed = []
for path in sorted(root.glob('*.html')):
    text = path.read_text(encoding='utf-8')
    updated = text.replace('localization.js?v=1.0.0', 'localization.js?v=1.0.4')
    updated = updated.replace('localization.js?v=1.0.3', 'localization.js?v=1.0.4')
    updated = updated.replace('localization.css?v=1.0.0', 'localization.css?v=1.0.4')
    updated = updated.replace('localization.css?v=1.0.3', 'localization.css?v=1.0.4')
    if updated != text:
        path.write_text(updated, encoding='utf-8')
        changed.append(path.name)
print(f'updated_pages={len(changed)}')
print('\n'.join(changed))
