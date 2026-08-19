from __future__ import annotations
import gzip, json, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
TARGET={1809,1810,1811,1813,1814,1817,1818,1821,1822,1823,1824,1825,1826,1828,1830,1831,1835,1836,1837,1838}
found={}
for path in (ROOT/'catalog-pages').glob('products-page-*.json.gz'):
    with gzip.open(path,'rt',encoding='utf-8') as stream: records=json.load(stream)
    for p in records:
        if int(p.get('id',-1)) in TARGET: found[int(p['id'])]=p
assert set(found)==TARGET
for pid,p in found.items():
    assert p.get('category')=='accessories'
    assert float(p['retail price'])*100 % 1 == 99 or round(float(p['retail price'])%1,2)==0.99
    assert float(p['sale price'])*100 % 1 == 99 or round(float(p['sale price'])%1,2)==0.99
    assert float(p['sale price']) <= float(p['retail price'])
repriced=[p for p in found.values() if p.get('price_pending') is False]
pending=[p for p in found.values() if p.get('price_pending') is True]
assert len(repriced)==16
assert {int(p['id']) for p in pending}=={1822,1825,1826,1830}
assert (ROOT/'products.js').read_bytes()==subprocess.check_output(['git','show','HEAD:products.js'])
report=json.loads((ROOT/'accessories-page10-tiered-pricing-report.json').read_text())
assert report['products_repriced']==16
print(json.dumps({'target_records':20,'repriced':16,'pending':[1822,1825,1826,1830],'all_prices_rounded_99':True,'first_159_authority_unchanged':True,'status':'PASS'},indent=2))
