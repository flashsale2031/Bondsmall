from __future__ import annotations
import gzip, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
for path in (ROOT/'catalog-pages').glob('products-page-*.json.gz'):
    with gzip.open(path,'rt',encoding='utf-8') as stream: records=json.load(stream)
    dirty=False
    for p in records:
        if int(p.get('id',-1))==1822:
            p['retail price']=99.99
            p['sale price']=49.99
            p['price_pending']=True
            p['pricing_confidence']='pending'
            p['pricing_comparable_count']=0
            p['pricing_method']='tiered-competitive-max-retail-min-sale-rounded-99'
            p['pricing_note']='No same-currency comparable set was verified; EUR and USD offers were not combined without an explicit FX date.'
            dirty=True
    if dirty:
        tmp=path.with_suffix(path.suffix+'.tmp')
        with gzip.open(tmp,'wt',encoding='utf-8',compresslevel=9) as stream: json.dump(records,stream,ensure_ascii=False,separators=(',',':'))
        tmp.replace(path)
report=json.loads((ROOT/'accessories-page10-tiered-pricing-report.json').read_text())
report['products_repriced']=len(report['records'])-1
report['products_with_no_supported_change']=[1822,1825,1826,1830]
report['records']=[r for r in report['records'] if r['id'] != 1822]
(ROOT/'accessories-page10-tiered-pricing-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('restored 1822; report updated')
