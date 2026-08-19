from __future__ import annotations
import gzip, json
from pathlib import Path

TARGET_IDS = {1809,1810,1811,1813,1814,1817,1818,1821,1822,1823,1824,1825,1826,1828,1830,1831,1835,1836,1837,1838}
found = {}
for path in sorted(Path('catalog-pages').glob('products-page-*.json.gz')):
    with gzip.open(path, 'rt', encoding='utf-8') as stream:
        for product in json.load(stream):
            if int(product.get('id', -1)) in TARGET_IDS:
                found[int(product['id'])] = {'id': product.get('id'), 'name': product.get('name'), 'category': product.get('category'), 'retail price': product.get('retail price'), 'sale price': product.get('sale price'), 'price_pending': product.get('price_pending'), 'source_file': path.name}
if set(found) != TARGET_IDS:
    raise SystemExit(f'missing IDs: {sorted(TARGET_IDS - set(found))}')
print(json.dumps([found[k] for k in sorted(found)], ensure_ascii=False, indent=2))
