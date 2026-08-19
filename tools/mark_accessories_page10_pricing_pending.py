from __future__ import annotations
import gzip, json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET_IDS = {1809,1810,1811,1813,1814,1817,1818,1821,1822,1823,1824,1825,1826,1828,1830,1831,1835,1836,1837,1838}
changed = []
for path in sorted((ROOT / 'catalog-pages').glob('products-page-*.json.gz')):
    with gzip.open(path, 'rt', encoding='utf-8') as stream:
        records = json.load(stream)
    dirty = False
    for product in records:
        if int(product.get('id', -1)) not in TARGET_IDS:
            continue
        old_prices = [product.get('retail price'), product.get('sale price')]
        product['price_pending'] = True
        product['price_pending_reason'] = 'Accessories page 10 competitive repricing reviewed; seven verified materially comparable retailer offers were not available for this exact variant, so current prices are preserved.'
        product['price_benchmark_attempted_at'] = str(date.today())
        dirty = True
        changed.append({'id': product.get('id'), 'name': product.get('name'), 'retail price': old_prices[0], 'sale price': old_prices[1], 'prices_changed': False, 'source_file': path.name})
    if dirty:
        temp = path.with_suffix(path.suffix + '.tmp')
        with gzip.open(temp, 'wt', encoding='utf-8', compresslevel=9) as stream:
            json.dump(records, stream, ensure_ascii=False, separators=(',', ':'))
        temp.replace(path)
if {r['id'] for r in changed} != TARGET_IDS:
    raise SystemExit(f'missing ids: {sorted(TARGET_IDS - {r["id"] for r in changed})}')
report = {'scope': 'accessories search-results page 10', 'product_count': len(changed), 'prices_changed': 0, 'records': changed, 'evidence_rule': 'seven verified materially comparable retailer offers per exact variant'}
(ROOT / 'accessories-page10-pricing-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
