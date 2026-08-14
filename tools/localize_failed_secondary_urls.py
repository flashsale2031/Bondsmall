import hashlib,json,re,io,concurrent.futures
from pathlib import Path
import requests
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]; CAT=ROOT/'catalog-pages'; ASSET=ROOT/'assets'/'secondary-images'; ASSET.mkdir(parents=True,exist_ok=True); PAT=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
av=json.loads((ROOT/'secondary-url-availability.json').read_text()); failed={x['url'] for x in av if not x.get('ok')}
def digest(u): return hashlib.sha256(u.encode()).hexdigest()[:20]
rep={}; pages=[]
for page in range(11,61578):
 f=CAT/f'products-page-{page:05d}.js'; pages.append(f); m=PAT.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']'); recs=recs[0] if recs and isinstance(recs[0],list) else recs
 for p in recs:
  imgs=p.get('images') or []; prim=p.get('image'); prim=prim[0] if isinstance(prim,list) and prim else prim
  if len(imgs)>1 and imgs[1] in failed and imgs[1] not in rep: rep[imgs[1]]=prim

def crop(item):
 u,primary=item; out=ASSET/f'failed-crop-{digest(u)}.jpg'
 if out.exists(): return u,out
 try:
  r=requests.get(primary,timeout=20,headers={'User-Agent':'Mozilla/5.0'}); r.raise_for_status(); im=Image.open(io.BytesIO(r.content)).convert('RGB'); w,h=im.size; side=min(w,h); im=im.crop(((w-side)//2,(h-side)//2,(w-side)//2+side,(h-side)//2+side)); im.thumbnail((640,640),Image.Resampling.LANCZOS); im.save(out,'JPEG',quality=86,optimize=True); return u,out
 except Exception:return u,None
with concurrent.futures.ThreadPoolExecutor(max_workers=32) as ex: crops={u:path for u,path in ex.map(crop,rep.items())}
counts={'pages':0,'records':0,'failed_urls':len(failed),'failed_urls_with_representative':len(rep),'crop_assets':sum(1 for result in crops.values() if result),'references_localized':0,'unresolved':0}
for f in pages:
 m=PAT.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']'); recs=recs[0] if recs and isinstance(recs[0],list) else recs
 for p in recs:
  counts['records']+=1; imgs=p.get('images') or []
  if len(imgs)>1 and imgs[1] in failed:
   asset=crops.get(imgs[1])
   if asset: p['images'][1]='assets/secondary-images/'+asset.name; p['secondary_image_storage']='repository-crop-fallback'; p['secondary_image_local_path']='assets/secondary-images/'+asset.name; counts['references_localized']+=1
   else: counts['unresolved']+=1
 payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk {int(f.stem.split("-")[-1])}\nwindow.products = window.products || [];\nwindow.products.push(...[{payload}]);\n',encoding='utf-8'); counts['pages']+=1
 if counts['pages']%2000==0: print(json.dumps({k:counts[k] for k in ('pages','references_localized','unresolved')}),flush=True)
(ROOT/'secondary-image-localization-report.json').write_text(json.dumps(counts,indent=2),encoding='utf-8'); print(json.dumps(counts,indent=2))
