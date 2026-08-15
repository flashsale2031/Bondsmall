import json,hashlib,io,re
from pathlib import Path
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
from PIL import Image
root=Path(__file__).resolve().parents[1]; cat=root/'catalog-pages'; assetdir=root/'assets/pages-10-17-images'; assetdir.mkdir(parents=True,exist_ok=True)
loc=json.loads((root/'pages-10-17-localization-report.json').read_text()) if (root/'pages-10-17-localization-report.json').exists() else {}
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)

def save_bytes(data,key):
 try:
  im=Image.open(io.BytesIO(data)); im.load()
  if im.width<80 or im.height<80:return None
  name=hashlib.sha1(key.encode()).hexdigest()[:16]+'.jpg'; path=assetdir/name
  im.convert('RGB').thumbnail((1000,1000)); im.convert('RGB').save(path,'JPEG',quality=88,optimize=True)
  return str(path.relative_to(root))
 except Exception:return None

def crop_variant(src,key):
 p=root/src
 try:
  im=Image.open(p).convert('RGB'); w,h=im.size
  box=(int(w*.12),int(h*.08),int(w*.88),int(h*.92)) if w>100 and h>100 else (0,0,w,h)
  im.crop(box).resize((min(1000,max(200,w)),min(1000,max(200,h)))).save(assetdir/(hashlib.sha1(key.encode()).hexdigest()[:16]+'.jpg'),'JPEG',quality=88,optimize=True)
  return str((assetdir/(hashlib.sha1(key.encode()).hexdigest()[:16]+'.jpg')).relative_to(root))
 except Exception:return None

def source_image(url,key):
 try:
  html=requests.get(url,timeout=25,headers={'User-Agent':'Mozilla/5.0'}).text
  soup=BeautifulSoup(html,'html.parser')
  cand=[]
  for sel in ('meta[property="og:image"]','meta[name="twitter:image"]'):
   x=soup.select_one(sel)
   if x and x.get('content'): cand.append(urljoin(url,x['content']))
  for x in soup.find_all('img')[:12]:
   u=x.get('src') or x.get('data-src')
   if u:cand.append(urljoin(url,u))
  for u in cand:
   r=requests.get(u,timeout=25,headers={'User-Agent':'Mozilla/5.0'})
   if r.ok:
    p=save_bytes(r.content,key)
    if p:return p
 except Exception:pass
 return None
summary={'pages':{},'repaired':0,'source_fetched':0,'crop_fallbacks':0,'failures':[]}
for page in range(10,18):
 f=cat/f'products-page-{page:05d}.js'; recs=json.loads('['+pat.search(f.read_text(encoding='utf-8')).group(1)+']')
 for p in recs:
  imgs=p.get('images') or []
  oldmain=p.get('image') or (imgs[0] if imgs else '')
  oldalt=imgs[1] if len(imgs)>1 else ''
  main=None; alt=None
  if page==10:
   main=loc.get(oldmain,{}).get('local')
   if not main: main=source_image(p.get('source_url',''),f'main-source-{p.get("id")}') if p.get('source_url') else None
   alt=loc.get(oldalt,{}).get('local')
   if not alt and main: alt=crop_variant(main,f'alt-crop-{p.get("id")}')
  else:
   if str(oldalt).startswith('assets/'): main=oldalt
   else: main=loc.get(oldalt,{}).get('local')
   if main: alt=crop_variant(main,f'alt-crop-{p.get("id")}')
  if main and alt:
   p['image']=main; p['images']=[main,alt]; p['gallery_normalized']='pages-10-17-localized-two-images'; summary['repaired']+=1
   if page==10 and p.get('source_url'): summary['source_fetched']+=1
   if alt!=oldalt: summary['crop_fallbacks']+=1
  else: summary['failures'].append({'page':page,'id':p.get('id'),'name':p.get('name'),'main':bool(main),'alt':bool(alt)})
 summary['pages'][str(page)]={'records':len(recs),'failures':sum(1 for x in summary['failures'] if x['page']==page)}
 payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk {page:05d}\nwindow.products = window.products || [];\nwindow.products.push(...{payload});\n',encoding='utf-8')
(root/'pages-10-17-repair-report.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps(summary))
