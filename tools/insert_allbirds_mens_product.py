from pathlib import Path
import json, requests
ROOT=Path(__file__).resolve().parents[1]
urls=[
'https://www.allbirds.com/cdn/shop/files/TR3MMST080_SHOE_LEFT_GLOBAL_MENS_TREE_RUNNER_MIST_WHITE_9959c126-77c8-42fc-aef3-7d6093c605bf.png?v=1751166590&width=1280',
'https://www.allbirds.com/cdn/shop/files/TR3MMST080_SHOE_BACK_GLOBAL_MENS_TREE_RUNNER_MIST_WHITE_4b1a41c7-cbf7-466b-a5e1-091a32c6382f.png?v=1751166590&width=1280',
'https://www.allbirds.com/cdn/shop/files/TR2MMST_SHOE_TOP_GLOBAL_MENS_TREE_RUNNER_MIST_WHITE_2be3a688-1266-4a6a-a702-d897c853a2a1.png?v=1751166590&width=1280',
'https://www.allbirds.com/cdn/shop/files/TR3MMST080_SHOE_BOTTOM_GLOBAL_MENS_TREE_RUNNER_MIST_WHITE_a2176742-5c6d-4f95-a531-ddb3d833201e.png?v=1751166590&width=1280',
'https://www.allbirds.com/cdn/shop/files/TR2MMST_SHOE_ANGLE_GLOBAL_MENS_TREE_RUNNER_MIST_WHITE_5285c42d-1399-41a4-86a3-49f21b0062a5.png?v=1751421348&width=1024',
]
id=1231542
asset_dir=ROOT/f'assets/products/bm-{id}'
asset_dir.mkdir(parents=True,exist_ok=True)
local=[]
for i,u in enumerate(urls,1):
    dest=asset_dir/f'{i:02d}.png'
    r=requests.get(u,headers={'User-Agent':'Mozilla/5.0'},timeout=45); r.raise_for_status()
    if not r.content.startswith(b'\x89PNG'):
        raise SystemExit(f'not png: {u} ({r.headers.get("content-type")})')
    dest.write_bytes(r.content); local.append(f'assets/products/bm-{id}/{dest.name}')
record={
'id':id,'name':"Allbirds Men's Tree Runner - Mist Grey",'category':'men','retail price':109.99,'sale price':99.99,
'image':local[0],'description':"Allbirds Men's Tree Runner in Mist Grey, a breathable everyday sneaker with a tree-fiber upper and SweetFoam cushioning.",'images':local,
'specifications':{'brand':'Allbirds','product_type':'Men’s Sneakers','color':'Mist Grey','source_store':'allbirds.com'},'sku':f'BM-{id}','productType':'Men','inventory':0,'age_group':'Adult','gender':'Male',
'source_url':'https://www.allbirds.com/products/mens-tree-runners-mist','source_catalog':'Official manufacturer product page','source_store':'allbirds.com','source_handle':'mens-tree-runners-mist','price_currency':'USD','price_is_estimate':True,'price_estimate_type':'official-indexed-price-adjusted-to-99-rule','official_indexed_price':'$100.00','merchant_ready':True,'google_product_category':'Apparel & Accessories > Shoes'
}
chunk=ROOT/'catalog-pages/products-page-61577.js'; t=chunk.read_text()
if f'"id":{id}' in t: raise SystemExit('record already present')
if not t.rstrip().endswith(']);'): raise SystemExit('unexpected chunk wrapper')
chunk.write_text(t.rstrip()[:-3]+','+json.dumps(record,separators=(',',':'),ensure_ascii=False)+']);\n')
(ROOT/'mens-verified-insert-allbirds.json').write_text(json.dumps({'record':record,'gallery_count':len(local)},indent=2)+'\n')
manifest=ROOT/'catalog-pages/manifest.json'; m=json.loads(manifest.read_text()); m['totalRecords']+=1; manifest.write_text(json.dumps(m,indent=2)+'\n')
print(json.dumps({'id':id,'gallery_count':len(local),'manifest_total':m['totalRecords']},indent=2))
