import json,re,requests,io,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from PIL import Image
root=Path(__file__).resolve().parents[1]; cat=root/'catalog-pages'; out=root/'assets'/'main-images'; out.mkdir(parents=True,exist_ok=True)
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); idx_re=re.compile(r'/train/(\d+)/product_image/')
def read_recs(f):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']'); return recs[0] if recs and isinstance(recs[0],list) else recs
files=[cat/f'products-page-{page:05d}.js' for page in range(10,61578)]
indices=set(); affected=0
for n,f in enumerate(files,1):
 for p in read_recs(f):
  x=p.get('image'); x=x[0] if isinstance(x,list) and x else x; mm=idx_re.search(str(x or ''))
  if mm: indices.add(int(mm.group(1))); affected+=1
 if n%5000==0: print(json.dumps({'scan_pages':n,'affected_records':affected,'unique_indices':len(indices)}),flush=True)
print(json.dumps({'affected_records':affected,'unique_hf_indices':len(indices)}),flush=True)
cache=root/'hf-main-signed-urls.json'; fresh=json.loads(cache.read_text()) if cache.exists() else {}
for start in range(0,max(indices,default=-1)+1,100):
 if all(i in fresh for i in indices if start <= i < start+100): continue
 payload=None
 for attempt in range(5):
  try:
   u=f'https://datasets-server.huggingface.co/rows?dataset=Shopify%2Fproduct-catalogue&config=default&split=train&offset={start}&length=100'
   r=requests.get(u,timeout=90)
   if r.status_code==200: payload=r.json(); break
  except Exception: pass
  time.sleep(2*(attempt+1))
 if payload is None:
  for off in range(start,start+100,25):
   for attempt in range(3):
    try:
     u=f'https://datasets-server.huggingface.co/rows?dataset=Shopify%2Fproduct-catalogue&config=default&split=train&offset={off}&length=25'; rr=requests.get(u,timeout=90)
     if rr.status_code==200:
      payload=rr.json()
      for row in payload.get('rows',[]):
       i=row.get('row_idx'); src=(row.get('row') or {}).get('product_image',{}).get('src')
       if i in indices and src: fresh[i]=src
      break
    except Exception: pass
    time.sleep(2*(attempt+1))
  continue
 for row in payload.get('rows',[]):
  i=row.get('row_idx'); src=(row.get('row') or {}).get('product_image',{}).get('src')
  if i in indices and src: fresh[i]=src
 if start%1000==0: cache.write_text(json.dumps(fresh),encoding='utf-8'); print(json.dumps({'source_offset':start,'fresh_signed_urls':len(fresh)}),flush=True)
cache.write_text(json.dumps(fresh),encoding='utf-8'); print(json.dumps({'fresh_signed_urls':len(fresh)}),flush=True)
def download(item):
 idx,src=item; target=out/f'hf-{idx}.jpg'
 if target.exists() and target.stat().st_size>1000: return True
 r=requests.get(src,timeout=90,headers={'User-Agent':'Mozilla/5.0'}); r.raise_for_status(); im=Image.open(io.BytesIO(r.content)).convert('RGB'); im.thumbnail((1600,1600)); im.save(target,'JPEG',quality=92,optimize=True); return True
errors=[]
with ThreadPoolExecutor(max_workers=8) as ex:
 fs=[ex.submit(download,(i,fresh[i])) for i in fresh]
 for fut in as_completed(fs):
  try: fut.result()
  except Exception as e: errors.append(repr(e))
print(json.dumps({'downloaded':len(fresh)-len(errors),'download_errors':len(errors)}),flush=True)
updated=0; changed_pages=0
for n,f in enumerate(files,1):
 recs=read_recs(f); changed=False
 for p in recs:
  x=p.get('image'); x=x[0] if isinstance(x,list) and x else x; mm=idx_re.search(str(x or ''))
  if not mm: continue
  idx=int(mm.group(1)); target=out/f'hf-{idx}.jpg'
  if idx in fresh and target.exists():
   old=x; new=f'assets/main-images/hf-{idx}.jpg'; imgs=p.get('images') or []; side=imgs[1] if len(imgs)>1 and isinstance(imgs[1],str) and imgs[1] and imgs[1]!=old else new
   p['image']=new; p['images']=[new,side]; p['main_image_source']='exact-refresh-from-Shopify-product-catalogue'; p['main_image_previous']=old; updated+=1; changed=True
 if changed:
  payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk {f.stem.split("-")[-1]}\nwindow.products = window.products || [];\nwindow.products.push(...[{payload}]);\n',encoding='utf-8'); changed_pages+=1
 if n%5000==0: print(json.dumps({'rewrite_pages':n,'updated_records':updated,'changed_pages':changed_pages}),flush=True)
report={'affected_records':affected,'unique_hf_indices':len(indices),'fresh_signed_urls':len(fresh),'updated_records':updated,'changed_pages':changed_pages,'download_errors':errors[:20]}
(root/'main-image-refresh-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)); print(json.dumps(report,indent=2))
