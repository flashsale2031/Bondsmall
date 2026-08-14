from __future__ import annotations
import json,re,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parent
PRODUCTS=ROOT/'products.js'; TMP=ROOT/'products.js.tmp'; SOURCE=ROOT.parent/'electronics-range.jsonl'; SOURCES=ROOT/'electronics-20000-sources.jsonl'; TARGET=20000

def image(row):
    for im in row.get('images') or []:
        if not isinstance(im,dict): continue
        for k in ('hi_res','large','thumb'):
            u=str(im.get(k) or '')
            if u.startswith('http'): return u
    return ''

def main():
    raw=PRODUCTS.read_bytes(); end=raw.rfind(b']')
    assert end>=0 and raw[:20].startswith(b'var products = [')
    existing_asins=set(m.decode() for m in re.findall(rb'"source_asin"\s*:\s*"([^"]+)"',raw))
    ids=[int(x) for x in re.findall(rb'"id"\s*:\s*(\d+)',raw)]; skus=[int(x) for x in re.findall(rb'"sku"\s*:\s*"BM-(\d+)"',raw)]
    next_id=max(ids)+1; next_sku=max(skus)+1; seen=set(); count=0
    with TMP.open('wb') as out, SOURCES.open('w',encoding='utf-8') as src, SOURCE.open(encoding='utf-8') as f:
        out.write(raw[:end]); out.write(b',\n')
        for line in f:
            try:r=json.loads(line)
            except Exception:continue
            asin=str(r.get('parent_asin') or '').strip(); title=str(r.get('title') or '').strip(); img=image(r)
            if not asin or asin in seen or asin in existing_asins or not title or not img: continue
            seen.add(asin); price=r.get('price') if isinstance(r.get('price'),(int,float)) else 0.0; desc=r.get('description') or r.get('features') or title
            if isinstance(desc,list): desc=' '.join(map(str,desc))
            sku=f'BM-{next_sku+count:05d}'; url=f'https://www.amazon.com/dp/{asin}'
            p={'id':next_id+count,'name':title[:150],'category':'electronics','retail price':float(price or 0),'sale price':None,'image':img,'description':str(desc)[:5000],'images':[img],'specifications':{'brand':str(r.get('store') or 'Amazon marketplace'),'source_asin':asin,'category_path':'Electronics'},'sku':sku,'productType':'Electronics','inventory':0,'age_group':'Adult','gender':'Unisex','source_url':url,'source_catalog':'Amazon Reviews 2023 product metadata','source_file':'electronics-range.jsonl','source_asin':asin,'price_pending':True,'merchant_ready':False}
            if count: out.write(b',\n')
            out.write(json.dumps(p,ensure_ascii=False,separators=(',',':')).encode())
            src.write(json.dumps({'id':p['id'],'sku':sku,'name':p['name'],'source_url':url,'source_asin':asin,'image':img,'price':price,'price_pending':True,'merchant_ready':False},ensure_ascii=False,separators=(',',':'))+'\n')
            count+=1
            if count%5000==0:print('appended',count)
            if count>=TARGET:break
    assert count==TARGET,count
    with TMP.open('ab') as out: out.write(b'\n];\n')
    shutil.move(TMP,PRODUCTS)
    print('added',count,'ids',next_id,'-',next_id+count-1)
if __name__=='__main__':main()
