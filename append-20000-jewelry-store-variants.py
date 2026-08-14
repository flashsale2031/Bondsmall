from __future__ import annotations
import json,re,shutil,html
from pathlib import Path
ROOT=Path(__file__).resolve().parent
PRODUCTS=ROOT/'products.js'; TMP=ROOT/'products.js.tmp'; RAW=ROOT.parent/'jewelry-20000-raw.json'; SOURCES=ROOT/'jewelry-20000-sources.jsonl'; TARGET=20000

def clean(v):
    v=html.unescape(str(v or ''))
    v=re.sub(r'<[^>]+>',' ',v)
    return re.sub(r'\s+',' ',v).strip()

def first_image(row):
    imgs=row.get('images') or []
    if imgs and isinstance(imgs[0],dict): return str(imgs[0].get('src') or '')
    return ''

def main():
    raw=PRODUCTS.read_bytes(); end=raw.rfind(b']')
    assert end>=0 and raw[:20].startswith(b'var products = [')
    ids=[int(x) for x in re.findall(rb'"id"\s*:\s*(\d+)',raw)]
    skus=[int(x) for x in re.findall(rb'"sku"\s*:\s*"BM-(\d+)"',raw)]
    next_id=max(ids)+1; next_sku=max(skus)+1; seen=set(); count=0
    rows=json.loads(RAW.read_text(encoding='utf-8'))
    with TMP.open('wb') as out, SOURCES.open('w',encoding='utf-8') as src:
        out.write(raw[:end]); out.write(b',\n')
        for row in rows:
            store=str(row.get('_source_store') or 'online store'); handle=str(row.get('handle') or '')
            title=clean(row.get('title'))
            img=first_image(row)
            if not title or not img.startswith('http') or not handle: continue
            product_url=str(row.get('_source_url') or f'https://{store}/products/{handle}')
            for variant in row.get('variants') or []:
                vid=str(variant.get('id') or '')
                if not vid or vid in seen: continue
                seen.add(vid)
                vtitle=clean(variant.get('title'))
                name=(title+' — '+vtitle)[:150] if vtitle and vtitle.lower() not in ('default title','default') else title[:150]
                sku=f'BM-{next_sku+count:05d}'
                price=float(re.sub(r'[^0-9.]','',str(variant.get('price') or '0')) or 0)
                desc=clean(row.get('body_html')) or name
                p={'id':next_id+count,'name':name,'category':'jewelry','retail price':price,'sale price':None,'image':img,'description':desc[:5000],'images':[img],'specifications':{'brand':clean(row.get('vendor')) or 'Online jewelry store','product_type':clean(row.get('product_type')) or 'Jewelry','source_store':store,'source_variant_id':vid},'sku':sku,'productType':'Jewelry','inventory':0,'age_group':'Adult','gender':'Unisex','source_url':product_url,'source_catalog':'Public Shopify online-store product feed','source_store':store,'source_handle':handle,'source_variant_id':vid,'price_pending':True,'merchant_ready':False}
                if count: out.write(b',\n')
                out.write(json.dumps(p,ensure_ascii=False,separators=(',',':')).encode())
                src.write(json.dumps({'id':p['id'],'sku':sku,'name':name,'category':'jewelry','source_url':product_url,'source_store':store,'source_handle':handle,'source_variant_id':vid,'image':img,'retail_price':price,'price_pending':True,'merchant_ready':False},ensure_ascii=False,separators=(',',':'))+'\n')
                count+=1
                if count%5000==0: print('appended',count)
                if count>=TARGET: break
            if count>=TARGET: break
    assert count==TARGET,count
    with TMP.open('ab') as out: out.write(b'\n];\n')
    shutil.move(TMP,PRODUCTS)
    print('added',count,'ids',next_id,'-',next_id+count-1)
if __name__=='__main__': main()
