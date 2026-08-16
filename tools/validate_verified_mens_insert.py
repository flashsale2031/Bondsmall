from pathlib import Path
import json,re
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
chunk=ROOT/'catalog-pages/products-page-61577.js'
t=chunk.read_text(); m=re.search(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',t,re.S)
if not m: raise SystemExit('chunk wrapper invalid')
arr=json.loads('['+m.group(1)+']')
record=next((p for p in arr if p.get('id')==1231541),None)
if not record: raise SystemExit('record missing')
imgs=record.get('images',[])
if len(imgs)<4: raise SystemExit(f'gallery too short: {len(imgs)}')
for rel in imgs:
 p=ROOT/rel
 if not p.exists(): raise SystemExit(f'missing local image: {rel}')
 with Image.open(p) as im:
  if im.width<200 or im.height<200: raise SystemExit(f'image too small: {rel} {im.size}')
for k in ('retail price','sale price'):
 v=float(record[k]);
 if round(v*100)%100 != 99: raise SystemExit(f'price rule failed {k}: {v}')
manifest=json.loads((ROOT/'catalog-pages/manifest.json').read_text())
idxtext=(ROOT/'catalog-category-index.js').read_text(); idx=json.loads(idxtext.split('=',1)[1].strip().rstrip(';'))
print(json.dumps({'id':record['id'],'category':record['category'],'gallery_count':len(imgs),'image_sizes_ok':True,'retail_price':record['retail price'],'sale_price':record['sale price'],'manifest_total':manifest['totalRecords'],'manifest_pages':manifest['pageCount'],'men_index_count':idx['categories']['men']['count'],'men_index_chunk_count':len(idx['categories']['men']['chunks'])},indent=2))
