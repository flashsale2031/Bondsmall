from __future__ import annotations
import gzip,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
TARGET_ID=23
NEW_RETAIL=399.99
NEW_SALE=249.99
for path in (ROOT/'catalog-pages').glob('products-page-*.json.gz'):
    with gzip.open(path,'rt',encoding='utf-8') as stream: records=json.load(stream)
    dirty=False
    for p in records:
        if int(p.get('id',-1)) != TARGET_ID: continue
        assert '2018' in p.get('name','') and '512 GB' in p.get('name','')
        p['retail price']=NEW_RETAIL
        p['sale price']=NEW_SALE
        p['price_pending']=False
        p['pricing_confidence']='medium'
        p['pricing_comparable_count']=4
        p['pricing_method']='tiered-competitive-max-retail-min-sale-rounded-99'
        p['pricing_note']='Four current comparable sources were used: Swappa exact 512GB listings, UpTrade 512GB refurbished listings, Mac of All Trades 512GB refurbished listing, and eBay 512GB used/refurbished comparables. Condition and CPU variation reduce confidence from high to medium.'
        p['pricing_sources']=[
          'https://swappa.com/listings/macbook-pro-2018-15-touch',
          'https://uptradeit.com/buy-used-refurbished-macbook-pro-2018',
          'https://www.macofalltrades.com/apple-macbook-pro-15-inch-2.6ghz-six-core-i7-retina-mid-2018/',
          'https://www.ebay.com/shop/macbook-pro-2018-i7?_nkw=macbook+pro+2018+i7'
        ]
        dirty=True
    if dirty:
        tmp=path.with_suffix(path.suffix+'.tmp')
        with gzip.open(tmp,'wt',encoding='utf-8',compresslevel=9) as stream: json.dump(records,stream,ensure_ascii=False,separators=(',',':'))
        tmp.replace(path)
        out={'id':23,'name':'Apple Macbook Pro 15 Inch Screen With Retina Display (2018) 512 GB','old_retail':1999.99,'old_sale':None,'new_retail':NEW_RETAIL,'new_sale':NEW_SALE,'comparables':4,'confidence':'medium','source_file':path.name}
        (ROOT/'macbook-2018-512gb-pricing-report.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(out,ensure_ascii=False,indent=2))
        raise SystemExit(0)
raise SystemExit('target id 23 not found')
