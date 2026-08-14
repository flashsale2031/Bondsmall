import hashlib,json,re,io,concurrent.futures
from pathlib import Path
import requests
from PIL import Image,ImageOps
ROOT=Path(__file__).resolve().parents[1]; CAT=ROOT/'catalog-pages'; ASSET=ROOT/'assets'/'secondary-images'; ASSET.mkdir(parents=True,exist_ok=True)
PAT=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
urls=set(); products=[]
for page in range(11,61578):
 m=PAT.search((CAT/f'products-page-{page:05d}.js').read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']')
 if recs and isinstance(recs[0],list): recs=recs[0]
 for p in recs:
  imgs=p.get('images') or []
  if len(imgs)>1 and isinstance(imgs[1],str): urls.add(imgs[1])

def digest(u): return hashlib.sha256(u.encode()).hexdigest()[:20]
def fetch_asset(u, stem):
 try:
  r=requests.get(u,timeout=20,headers={'User-Agent':'Mozilla/5.0'},stream=True)
  if r.status_code>=400: return None
  data=r.content; im=Image.open(io.BytesIO(data)).convert('RGB'); im.thumbnail((640,640),Image.Resampling.LANCZOS)
  out=ASSET/(stem+'.jpg'); im.save(out,'JPEG',quality=86,optimize=True); return out
 except Exception: return None
local={}
with concurrent.futures.ThreadPoolExecutor(max_workers=24) as ex:
 futs={ex.submit(fetch_asset,u,'remote-'+digest(u)):u for u in urls}
 for fut in concurrent.futures.as_completed(futs):
  u=futs[fut]; p=fut.result()
  if p: local[u]='assets/secondary-images/'+p.name
fallback_count=0; local_count=0; reused_fallback=0; fallback_cache={}; modified=0; sample=[]
def fallback_for(primary):
 global fallback_count,reused_fallback
 if primary in fallback_cache: reused_fallback+=1; return fallback_cache[primary]
 try:
  r=requests.get(primary,timeout=20,headers={'User-Agent':'Mozilla/5.0'}); im=Image.open(io.BytesIO(r.content)).convert('RGB')
  w,h=im.size; side=min(w,h); left=(w-side)//2; top=(h-side)//2; im=im.crop((left,top,left+side,top+side)); im.thumbnail((640,640),Image.Resampling.LANCZOS)
  name='crop-'+digest(primary)+'.jpg'; out=ASSET/name; im.save(out,'JPEG',quality=86,optimize=True); path='assets/secondary-images/'+name; fallback_cache[primary]=path; fallback_count+=1; return path
 except Exception: return primary
for page in range(11,61578):
 f=CAT/f'products-page-{page:05d}.js'; m=PAT.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']')
 if recs and isinstance(recs[0],list): recs=recs[0]
 for p in recs:
  imgs=p.get('images') or []; primary=p.get('image'); primary=primary[0] if isinstance(primary,list) and primary else primary
  if len(imgs)>1:
   src=imgs[1]; path=local.get(src)
   if path:
    p['images']=[primary,path]; p['secondary_image_storage']='repository'; p['secondary_image_local_path']=path; local_count+=1
   else:
    path=fallback_for(primary); p['images']=[primary,path]; p['secondary_image_storage']='repository-crop-fallback' if path!=primary else 'remote-primary-fallback'; p['secondary_image_local_path']=path; fallback_count+=1
   if len(sample)<20: sample.append({'id':p.get('id'),'name':p.get('name'),'secondary_storage':p.get('secondary_image_storage'),'secondary':p['images'][1]})
 payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk {page}\nwindow.products = window.products || [];\nwindow.products.push(...[{payload}]);\n',encoding='utf-8'); modified+=1
report={'unique_secondary_urls':len(urls),'downloaded_unique_assets':len(local),'records_repointed_to_local':local_count,'fallback_assets':len(fallback_cache),'fallback_references':fallback_count,'reused_fallback_references':reused_fallback,'samples':sample}
(ROOT/'secondary-image-localization-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps(report,indent=2,ensure_ascii=False))
