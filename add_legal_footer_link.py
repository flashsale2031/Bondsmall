from pathlib import Path

root = Path('.')
legal_link = '        <a href="legal.html"><span class="footer-icon" aria-hidden="true">LG</span>Legal</a>\n'
updated = []
for path in sorted(root.glob('*.html')):
    if path.name == 'legal.html':
        continue
    text = path.read_text(encoding='utf-8')
    if 'class="site-footer-menu"' not in text or 'href="recentorders.html"' not in text:
        continue
    if 'href="legal.html"' in text:
        continue
    marker = '        <a href="recentorders.html"><span class="footer-icon" aria-hidden="true">RO</span>Recent Orders</a>\n'
    if marker not in text:
        continue
    path.write_text(text.replace(marker, marker + legal_link, 1), encoding='utf-8')
    updated.append(path.name)
print('\n'.join(updated))
print(f'Updated {len(updated)} footer files.')
