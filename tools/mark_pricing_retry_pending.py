from __future__ import annotations
import gzip, json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
START_POSITION = 160
END_POSITION = 179
changed = []
position = 0
for path in sorted((ROOT / 'catalog-pages').glob('products-page-*.json.gz')):
    with gzip.open(path, 'rt', encoding='utf-8') as stream:
        records = json.load(stream)
    dirty = False
    for product in records:
        position += 1
        if START_POSITION <= position <= END_POSITION:
            # Preserve current displayed prices until the seven-offer evidence gate is met.
            desired = {
                'price_pending': True,
                'price_pending_reason': 'Competitive repricing retry requires seven verified materially comparable retailer offers; current public evidence is insufficient.',
                'price_benchmark_attempted_at': str(date.today()),
            }
            for key, value in desired.items():
                if product.get(key) != value:
                    product[key] = value
                    dirty = True
            changed.append({
                'position': position,
                'id': product.get('id'),
                'name': product.get('name'),
                'retail price': product.get('retail price'),
                'sale price': product.get('sale price'),
                'price_pending': product.get('price_pending'),
            })
    if dirty:
        temp = path.with_suffix(path.suffix + '.tmp')
        with gzip.open(temp, 'wt', encoding='utf-8', compresslevel=9) as stream:
            json.dump(records, stream, ensure_ascii=False, separators=(',', ':'))
        temp.replace(path)

report = {
    'scope': {'start_position': START_POSITION, 'end_position': END_POSITION, 'count': len(changed)},
    'prices_changed': 0,
    'records_marked_pending': len(changed),
    'records': changed,
    'reason': 'Insufficient verified seven-retailer coverage; no price values were changed.',
}
(ROOT / 'pricing-retry-pending-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
