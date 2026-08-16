from pathlib import Path
import json, requests, re
ROOT=Path(__file__).resolve().parents[1]
cand=json.loads((ROOT/'mens-verified-candidates.json').read_text())['candidates'][0]
# Keep only distinct view names; exclude responsive/zoom duplicates.
gallery=[]; seen=set()
for u in cand['gallery']:
    view=re.search(r's7-1151197_([^?$]+)',u)
    key=view.group(1) if view else u
    if key in seen or 'zoom' in u.lower() or '_mob' in u.lower(): continue
    seen.add(key); gallery.append(u)
if len(gallery)<4: raise SystemExit(f'gallery gate failed: {len(gallery)}')
asset_dir=ROOT/'assets/products/bm-1231541'
asset_dir.mkdir(parents=True,exist_ok=True)
local=[]
for i,u in enumerate(gallery,1):
    dest=asset_dir/f'{i:02d}.jpg'
    r=requests.get(u,headers={'User-Agent':'Mozilla/5.0'},timeout=45)
    r.raise_for_status()
    if not r.content.startswith(b'\xff\xd8'):
        raise SystemExit(f'not jpeg: {u} ({r.headers.get("content-type")})')
    dest.write_bytes(r.content); local.append(f'assets/products/bm-1231541/{dest.name}')
record={
 'id':1231541,
 'name':'Polo Ralph Lauren The Iconic Oxford Shirt',
 'category':'men',
 'retail price':129.99,
 'sale price':89.99,
 'image':local[0],
 'description':'The Iconic Oxford Shirt by Polo Ralph Lauren, an all-fits cotton oxford button-down shirt from the official Ralph Lauren product page.',
 'images':local,
 'specifications':{'brand':'Polo Ralph Lauren','product_type':'Oxford Shirt','manufacturer_product_id':'342680','source_store':'ralphlauren.com'},
 'sku':'BM-1231541','productType':'Men','inventory':0,'age_group':'Adult','gender':'Male',
 'source_url':cand['sourceUrl'],'source_catalog':'Official manufacturer product page','source_store':'ralphlauren.com','source_variant_id':'342680',
 'price_currency':'USD','price_is_estimate':False,'merchant_ready':True,'google_product_category':'Apparel & Accessories > Clothing > Shirts & Tops'
}
chunk=ROOT/'catalog-pages/products-page-61577.js'
t=chunk.read_text()
if '"id":1231541' in t: raise SystemExit('record already present')
if not t.rstrip().endswith(']);'): raise SystemExit('unexpected chunk wrapper')
t=t.rstrip()[:-3]+','+json.dumps(record,separators=(',',':'),ensure_ascii=False)+']);\n'
chunk.write_text(t)
(ROOT/'mens-verified-insert.json').write_text(json.dumps({'record':record,'gallery_count':len(local)},indent=2)+'\n')
print(json.dumps({'id':record['id'],'gallery_count':len(local),'chunk':str(chunk.relative_to(ROOT))},indent=2))
