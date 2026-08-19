from __future__ import annotations
import gzip, json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET_IDS = {1809,1810,1811,1813,1814,1817,1818,1821,1822,1823,1824,1825,1826,1828,1830,1831,1835,1836,1837,1838}
found = {}
for path in sorted((ROOT / 'catalog-pages').glob('products-page-*.json.gz')):
    with gzip.open(path, 'rt', encoding='utf-8') as stream:
        for product in json.load(stream):
            if int(product.get('id', -1)) in TARGET_IDS:
                found[int(product['id'])] = product
assert set(found) == TARGET_IDS
assert all(p.get('category') == 'accessories' for p in found.values())
assert all(p.get('price_pending') is True for p in found.values())
assert all(p.get('price_pending_reason') for p in found.values())
report = json.loads((ROOT / 'accessories-page10-pricing-report.json').read_text())
assert report['product_count'] == 20
assert report['prices_changed'] == 0
assert all(not item['prices_changed'] for item in report['records'])
assert (ROOT / 'products.js').read_bytes() == subprocess.check_output(['git', 'show', 'HEAD:products.js'])
print(json.dumps({'target_records': len(found), 'category': 'accessories', 'prices_changed': 0, 'first_159_authority_unchanged': True, 'status': 'PASS'}, indent=2))
