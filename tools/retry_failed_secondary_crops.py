import hashlib,json,re,io,concurrent.futures
from pathlib import Path
import requests
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]; CAT=ROOT/'catalog-pages'; ASSET=ROOT/'assets'/'secondary-images'; ASSET.mkdir(parents=True,exist_ok=True); PAT=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
av=json.loads((ROOT/'secondary-url-availability.json').read_text()); failed={x['url'] for x in av if not x.get('ok')}; candidates={u:[] for u in failed}; files=[]
for page in range(11,61578):
 f=CAT/f'products-page-{page:05d}.js'; files.append(f); m=PAT.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']'); recs=recs[0] if recs and isinstance(recs[0],list) else recs
 for p in recs:
  imgs=p.get('images') or []; primary=p.get('image'); primary=primary[0] if isinstance(primary,list) and primary else primary
  if len(imgs)>1 and imgs[1] in failed and primary and primary not in candidates[imgs[1]] and len(candidates[imgs[1]])<12: candidates[imgs[1]].append(primary)
def digest(u): return hashlib.sha256(u.encode()).hexdigest()[:20]
def try_crop(item):
 u,plist=item
 out=ASSET/f'failed-crop-{digest(u)}.jpg'
 if out.exists(): return u,out
 for primary in plist:
  try:
   r=requests.get(primary,timeout=15,headers={'User-Agent':'Mozilla/5.0'}); r.raise_for_status(); im=Image.open(io.BytesIO(r.content)).convert('RGB'); w,h=im.size; side=min(w,h); im=im.crop(((w-side)//2,(h-side)//2,(w-side)//2+side,(h-side)//2+side)); im.thumbnail((640,640),Image.Resampling.LANCZOS); im.save(out,'JPEG',quality=86,optimize=True); return u,out
  except Exception: continue
 return u,None
with concurrent.futures.ThreadPoolExecutor(max_workers=32) as ex: results=list(ex.map(try_crop,candidates.items()))
mapping={u:p for u,p in results if p}; unresolved=set(failed)-set(mapping); refs=0
for f in files:
 text=f.read_text(encoding='utf-8')
 for u,p in mapping.items():
  if u in text: text=text.replace('"'+u+'"','"assets/secondary-images/'+p.name+'"'); refs+=text.count('assets/secondary-images/'+p.name)
 f.write_text(text,encoding='utf-8')
report={'failed_urls':len(failed),'candidate_urls':sum(bool(v) for v in candidates.values()),'crop_assets_total':len(mapping),'unresolved_urls':len(unresolved),'references_replaced':refs,'unresolved_samples':list(unresolved)[:10]}
(ROOT/'secondary-image-retry-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)); print(json.dumps(report,indent=2))
