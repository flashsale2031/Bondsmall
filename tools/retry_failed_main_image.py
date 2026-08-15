import json,re,requests,io,time
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]; idx=34841; split='train'; target=root/'assets'/'main-images'/f'hf-{split}-{idx}.jpg'
for attempt in range(8):
 u=f'https://datasets-server.huggingface.co/rows?dataset=Shopify%2Fproduct-catalogue&config=default&split={split}&offset={idx}&length=1'
 try:
  r=requests.get(u,timeout=120); r.raise_for_status(); row=r.json()['rows'][0]; src=row['row']['product_image']['src']; imr=requests.get(src,timeout=120,headers={'User-Agent':'Mozilla/5.0'}); imr.raise_for_status(); im=Image.open(io.BytesIO(imr.content)).convert('RGB'); im.thumbnail((1600,1600)); im.save(target,'JPEG',quality=92,optimize=True); break
 except Exception as e:
  if attempt==7: raise
  time.sleep(3*(attempt+1))
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); idx_re=re.compile(r'/default/train/34841/product_image/')
for f in (root/'catalog-pages').glob('products-page-*.js'):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']'); recs=recs[0] if recs and isinstance(recs[0],list) else recs; changed=False
 for p in recs:
  x=p.get('image'); x=x[0] if isinstance(x,list) and x else x
  if idx_re.search(str(x or '')):
   old=x; new=f'assets/main-images/hf-{split}-{idx}.jpg'; imgs=p.get('images') or []; side=imgs[1] if len(imgs)>1 and isinstance(imgs[1],str) and imgs[1]!=old else new; p['image']=new; p['images']=[new,side]; p['main_image_source']='exact-refresh-from-Shopify-product-catalogue'; p['main_image_previous']=old; changed=True
 if changed:
  payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk {f.stem.split("-")[-1]}\nwindow.products = window.products || [];\nwindow.products.push(...[{payload}]);\n',encoding='utf-8'); print(f)
