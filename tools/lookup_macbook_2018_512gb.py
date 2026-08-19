from __future__ import annotations
import gzip,json
from pathlib import Path
needle='Apple Macbook Pro 15 Inch Screen With Retina Display (2018) 512 GB'.lower()
found=[]
for path in sorted(Path('catalog-pages').glob('products-page-*.json.gz')):
    with gzip.open(path,'rt',encoding='utf-8') as stream:
        for p in json.load(stream):
            if needle in str(p.get('name','')).lower():
                found.append({'id':p.get('id'),'name':p.get('name'),'category':p.get('category'),'retail price':p.get('retail price'),'sale price':p.get('sale price'),'price_pending':p.get('price_pending'),'source_file':path.name})
print(json.dumps(found,ensure_ascii=False,indent=2))
if len(found)!=1: raise SystemExit(f'expected one exact match, found {len(found)}')
