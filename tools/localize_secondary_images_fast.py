import hashlib,json,re,io,sys
from pathlib import Path
import requests
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]; CAT=ROOT/'catalog-pages'; ASSET=ROOT/'assets'/'secondary-images'; ASSET.mkdir(parents=True,exist_ok=True)
PAT=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
av=json.loads((ROOT/'secondary-url-availability.json').read_text(encoding='utf-8')); ok={x['url']:x.get('ok',False) for x in av}
def digest(u): return hashlib.sha256(u.encode()).hexdigest()[:20]
def local_for_url(u): return ASSET/f'remote-{digest(u)}.jpg'
def download(u):
 out=local_for_url(u)
 if out.exists(): return out
 try:
  r=requests.get(u,timeout=20,headers={'User-Agent':'Mozilla/5.0'}); r.raise_for_status(); im=Image.open(io.BytesIO(r.content)).convert('RGB'); im.thumbnail((640,640),Image.Resampling.LANCZOS); im.save(out,'JPEG',quality=86,optimize=True); return out
 except Exception:return None
def crop_for(primary):
 out=ASSET/f'crop-{digest(primary)}.jpg'
 if out.exists(): return out
 try:
  r=requests.get(primary,timeout=20,headers={'User-Agent':'Mozilla/5.0'}); r.raise_for_status(); im=Image.open(io.BytesIO(r.content)).convert('RGB'); w,h=im.size; side=min(w,h); im=im.crop(((w-side)//2,(h-side)//2,(w-side)//2+side,(h-side)//2+side)); im.thumbnail((640,640),Image.Resampling.LANCZOS); im.save(out,'JPEG',quality=86,optimize=True); return out
 except Exception:return None
reports={'pages':0,'records':0,'remote_local':0,'crop_fallback':0,'unresolved':0,'samples':[]}
for page in range(11,61578):
 f=CAT/f'products-page-{page:05d}.js'; m=PAT.search(f.read_text(encoding='utf-8'))
 if not m: raise RuntimeError(f'bad chunk {f}')
 recs=json.loads('['+m.group(1)+']'); recs=recs[0] if recs and isinstance(recs[0],list) else recs
 for p in recs:
  reports['records']+=1; imgs=p.get('images') or []
  if len(imgs)>1:
   primary=p.get('image'); primary=primary[0] if isinstance(primary,list) and primary else primary; src=imgs[1]
   asset=None
   if ok.get(src,False): asset=download(src); kind='repository-download'
   else: kind='repository-crop-fallback'; asset=crop_for(primary)
   if asset:
    p['images']=[primary,'assets/secondary-images/'+asset.name]; p['secondary_image_storage']=kind; p['secondary_image_local_path']='assets/secondary-images/'+asset.name
    reports['remote_local' if kind=='repository-download' else 'crop_fallback']+=1
   else: reports['unresolved']+=1
   if len(reports['samples'])<15: reports['samples'].append({'id':p.get('id'),'storage':kind if asset else 'unresolved','secondary':p['images'][1] if len(p.get('images',[]))>1 else None})
 payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk {page}\nwindow.products = window.products || [];\nwindow.products.push(...[{payload}]);\n',encoding='utf-8'); reports['pages']+=1
 if page%1000==0: print(json.dumps({'page':page,**{k:reports[k] for k in ('remote_local','crop_fallback','unresolved')}}),flush=True)
(ROOT/'secondary-image-localization-report.json').write_text(json.dumps(reports,indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps(reports,indent=2,ensure_ascii=False))
