from __future__ import annotations
import json, re, shutil
from pathlib import Path
import pandas as pd
ROOT=Path(__file__).resolve().parent
PRODUCTS=ROOT/'products.js'; TMP=ROOT/'products.js.tmp'; SOURCES=ROOT/'entertainment-20000-sources.jsonl'; TARGET=20000
DATA=ROOT.parent/'amazon_products'
TERMS=('toys & games','games & accessories','video games','music','movies','tv','collectible','hobbies','musical instrument','arts & crafts','party supplies','sports & outdoors')

def price(v):
    m=re.search(r'([0-9]+(?:\.[0-9]+)?)',str(v or ''))
    return float(m.group(1)) if m else 0.0

def asin_from(spec):
    m=re.search(r'ASIN:([A-Z0-9]{10})',str(spec or ''))
    return m.group(1) if m else ''

def main():
    raw=PRODUCTS.read_bytes(); end=raw.rfind(b']')
    assert end>=0 and raw[:20].startswith(b'var products = [')
    ids=[int(x) for x in re.findall(rb'"id"\s*:\s*(\d+)',raw)]
    skus=[int(x) for x in re.findall(rb'"sku"\s*:\s*"BM-(\d+)"',raw)]
    existing_source=set(x.decode() for x in re.findall(rb'"source_asin"\s*:\s*"([^"]+)"',raw))
    next_id=max(ids)+1; next_sku=max(skus)+1; seen=set(); count=0
    with TMP.open('wb') as out, SOURCES.open('w',encoding='utf-8') as src:
        out.write(raw[:end]); out.write(b',\n')
        for path in sorted(DATA.glob('*.parquet')):
            df=pd.read_parquet(path)
            for _,r in df.iterrows():
                cat=str(r.get('Category') or '').lower()
                if not any(t in cat for t in TERMS): continue
                title=str(r.get('Product Name') or '').strip(); img=str(r.get('Image') or '').strip(); asin=asin_from(r.get('Product Specification'))
                key=(asin,title,img)
                if not asin or not title or not img.startswith('http') or key in seen: continue
                seen.add(key)
                sku=f'BM-{next_sku+count:05d}'; url=f'https://www.amazon.com/dp/{asin}'
                desc=str(r.get('Description') or title).strip()[:5000]
                p={'id':next_id+count,'name':title[:150],'category':'entertainment','retail price':price(r.get('Selling Price')),'sale price':None,'image':img,'description':desc,'images':[img],'specifications':{'brand':'Amazon marketplace','source_asin':asin,'category_path':str(r.get('Category') or 'Toys & Games')[:500]},'sku':sku,'productType':'Entertainment','inventory':0,'age_group':'Adult','gender':'Unisex','source_url':url,'source_catalog':'Amazon Products dataset','source_file':path.name,'source_asin':asin,'source_listing_key':f'{asin}:{count}','price_pending':True,'merchant_ready':False}
                if count: out.write(b',\n')
                out.write(json.dumps(p,ensure_ascii=False,separators=(',',':')).encode())
                src.write(json.dumps({'id':p['id'],'sku':sku,'name':p['name'],'category':'entertainment','source_url':url,'source_asin':asin,'source_file':path.name,'source_listing_key':p['source_listing_key'],'image':img,'retail_price':p['retail price'],'price_pending':True,'merchant_ready':False},ensure_ascii=False,separators=(',',':'))+'\n')
                count+=1
                if count%5000==0: print('appended',count)
                if count>=TARGET: break
            if count>=TARGET: break
    assert count==TARGET,count
    with TMP.open('ab') as out: out.write(b'\n];\n')
    shutil.move(TMP,PRODUCTS)
    print('added',count,'ids',next_id,'-',next_id+count-1)
if __name__=='__main__': main()
