from __future__ import annotations
import gzip, json
from pathlib import Path
records=[]
for path in sorted(Path('catalog-pages').glob('products-page-*.json.gz'))[:10]:
    with gzip.open(path,'rt',encoding='utf-8') as stream:
        records.extend(json.load(stream))
for pos, product in enumerate(records, start=1):
    if 160 <= pos <= 179:
        print(json.dumps({'position':pos,'id':product.get('id'),'name':product.get('name'),'retail price':product.get('retail price'),'sale price':product.get('sale price'),'price_pending':product.get('price_pending'),'price_is_estimate':product.get('price_is_estimate'),'price_benchmark_sources':product.get('price_benchmark_sources')},ensure_ascii=False))
