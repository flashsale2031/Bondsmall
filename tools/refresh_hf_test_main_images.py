import json,re,requests,io,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from PIL import Image
root=Path(__file__).resolve().parents[1]; cat=root/'catalog-pages'; out=root/'assets'/'main-images'; out.mkdir(parents=True,exist_ok=True)
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); idx_re=re.compile(r'/default/(test|train)/(\d+)/product_image/')
def read_recs(f):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']'); return recs[0] if recs and isinstance(recs[0],list) else recs
files=[cat/f'products-page-{page:05d}.js' for page in range(10,61578)]
indices={'test':set(),'train':set()}; affected=0
for f in files:
 for p in read_recs(f):
  x=p.get('image'); x=x[0] if isinstance(x,list) and x else x; mm=idx_re.search(str(x or ''))
  if mm: indices[mm.group(1)].add(int(mm.group(2))); affected+=1
print(json.dumps({'affected':affected,'test_indices':len(indices['test']),'train_indices':len(indices['train'])}),flush=True)
fresh={}
train_cache=root/'hf-main-signed-urls.json'
if train_cache.exists():
 cached=json.loads(train_cache.read_text())
 for i in indices['train']:
  if str(i) in cached: fresh[('train',i)]=cached[str(i)]
for split,idxs in indices.items():
 if not idxs or split=='train': continue
 for start in range(0,max(idxs)+1,100):
  payload=None
  for attempt in range(5):
   try:
    u=f'https://datasets-server.huggingface.co/rows?dataset=Shopify%2Fproduct-catalogue&config=default&split={split}&offset={start}&length=100'; r=requests.get(u,timeout=90)
    if r.status_code==200: payload=r.json(); break
   except Exception: pass
   time.sleep(2*(attempt+1))
  if payload:
   for row in payload.get('rows',[]):
    i=row.get('row_idx'); src=(row.get('row') or {}).get('product_image',{}).get('src')
    if i in idxs and src: fresh[(split,i)]=src
  if start%1000==0: print(json.dumps({'split':split,'offset':start,'fresh':len(fresh)}),flush=True)
print(json.dumps({'fresh_urls':len(fresh)}),flush=True)
def download(item):
 key,src=item; split,idx=key; target=out/f'hf-{split}-{idx}.jpg'
 if target.exists() and target.stat().st_size>1000: return True
 r=requests.get(src,timeout=90,headers={'User-Agent':'Mozilla/5.0'}); r.raise_for_status(); im=Image.open(io.BytesIO(r.content)).convert('RGB'); im.thumbnail((1600,1600)); im.save(target,'JPEG',quality=92,optimize=True); return True
errors=[]
with ThreadPoolExecutor(max_workers=8) as ex:
 fs=[ex.submit(download,item) for item in fresh.items()]
 for fut in as_completed(fs):
  try: fut.result()
  except Exception as e: errors.append(repr(e))
print(json.dumps({'downloaded':len(fresh)-len(errors),'errors':len(errors)}),flush=True)
updated=0; changed_pages=0
for n,f in enumerate(files,1):
 recs=read_recs(f); changed=False
 for p in recs:
  x=p.get('image'); x=x[0] if isinstance(x,list) and x else x; mm=idx_re.search(str(x or ''))
  if not mm: continue
  key=(mm.group(1),int(mm.group(2))); target=out/f'hf-{key[0]}-{key[1]}.jpg'
  if key in fresh and target.exists():
   old=x; new=f'assets/main-images/hf-{key[0]}-{key[1]}.jpg'; imgs=p.get('images') or []; side=imgs[1] if len(imgs)>1 and isinstance(imgs[1],str) and imgs[1] and imgs[1]!=old else new
   p['image']=new; p['images']=[new,side]; p['main_image_source']='exact-refresh-from-Shopify-product-catalogue'; p['main_image_previous']=old; updated+=1; changed=True
 if changed:
  payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk {f.stem.split("-")[-1]}\nwindow.products = window.products || [];\nwindow.products.push(...[{payload}]);\n',encoding='utf-8'); changed_pages+=1
 if n%5000==0: print(json.dumps({'rewrite_pages':n,'updated':updated,'changed_pages':changed_pages}),flush=True)
report={'affected':affected,'fresh_urls':len(fresh),'updated':updated,'changed_pages':changed_pages,'errors':errors[:20]}
(root/'main-image-test-refresh-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)); print(json.dumps(report,indent=2,ensure_ascii=False))
