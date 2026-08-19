from __future__ import annotations
import gzip,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
found=[]
for path in (ROOT/'catalog-pages').glob('products-page-*.json.gz'):
    with gzip.open(path,'rt',encoding='utf-8') as stream: records=json.load(stream)
    for p in records:
        if int(p.get('id',-1))==23: found.append(p)
assert len(found)==1
p=found[0]
assert p['name']=='Apple Macbook Pro 15 Inch Screen With Retina Display (2018) 512 GB'
assert p['category']=='electronics'
assert p['retail price']==399.99 and p['sale price']==249.99
assert round(float(p['retail price']) % 1, 2) == 0.99 and round(float(p['sale price']) % 1, 2) == 0.99
assert p['sale price']<=p['retail price']
assert p['price_pending'] is False and p['pricing_comparable_count']==4 and p['pricing_confidence']=='medium'
assert len(p['pricing_sources'])==4
assert (ROOT/'products.js').read_bytes()==subprocess.check_output(['git','show','HEAD:products.js'])
report=json.loads((ROOT/'macbook-2018-512gb-pricing-report.json').read_text())
assert report['new_retail']==399.99 and report['new_sale']==249.99
print(json.dumps({'id':23,'exact_variant':True,'retail':399.99,'sale':249.99,'comparables':4,'confidence':'medium','first_159_authority_file_unchanged':True,'status':'PASS'},indent=2))
