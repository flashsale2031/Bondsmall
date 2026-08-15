import json,re,io,hashlib,html
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import requests
from PIL import Image
root=Path(__file__).resolve().parents[1]; products=json.loads((root/'pages-10-17-products.json').read_text()); src=json.loads((root/'pages-10-17-image-candidates.json').read_text()); idx=json.loads((root/'pages-10-17-indexed-candidates.json').read_text()); outdir=root/'assets/pages-10-17-product-mains'; outdir.mkdir(parents=True,exist_ok=True)
stop={'the','and','for','with','set','of','a','an','on','in','to','new','premium','product','online','buy','from','natural','silver','gold','sterling'}
def toks(s): return {x for x in re.findall(r'[a-z0-9]+',s.lower()) if len(x)>2 and x not in stop}
def score(name,c):
 text=(c.get('title','')+' '+c.get('url','')).lower(); nt=toks(name); ct=toks(text); overlap=len(nt&ct); ratio=overlap/max(1,len(nt)); bonus=0
 if any(x in text for x in ('transparent.gif','error/logo','meta-logo.jpg','logo._ttd_','placeholder','social_share','/logo','logo.','linkedin.com','dms/image')): bonus-=25
 if c.get('engine')=='source': bonus+=3
 return ratio*10+overlap+bonus

def fetch(p):
 allc=[]
 for c in src.get(str(p['id']),{}).get('candidates',[]): allc.append({'engine':'source','url':c,'title':p['name']})
 allc.extend(idx.get(str(p['id']),{}).get('candidates',[])); allc.sort(key=lambda c:score(p['name'],c),reverse=True)
 attempts=[]
 for c in allc[:24]:
  u=c.get('url','')
  if not u.startswith('http') or any(x in u.lower() for x in ('transparent.gif','social_share','error/logo','meta-logo.jpg','logo._ttd_','/logo.','linkedin.com','dms/image')): continue
  try:
   r=requests.get(u,timeout=25,headers={'User-Agent':'Mozilla/5.0'},allow_redirects=True)
   im=Image.open(io.BytesIO(r.content)); im.load()
   if r.status_code>=400 or im.width<150 or im.height<150: attempts.append({'url':u,'score':score(p['name'],c),'error':'invalid'}); continue
   if im.width<250 or im.height<250: attempts.append({'url':u,'score':score(p['name'],c),'error':'small'}); continue
   name=f'{p["id"]}-'+hashlib.sha1(u.encode()).hexdigest()[:12]+'.jpg'; path=outdir/name; im.convert('RGB').thumbnail((1200,1200)); im.convert('RGB').save(path,'JPEG',quality=90,optimize=True)
   return {'page':p['page'],'id':p['id'],'name':p['name'],'url':u,'engine':c.get('engine'),'score':score(p['name'],c),'local':str(path.relative_to(root)),'attempts':attempts}
  except Exception as e: attempts.append({'url':u,'score':score(p['name'],c),'error':str(e)[:100]})
 return {'page':p['page'],'id':p['id'],'name':p['name'],'url':None,'engine':None,'score':None,'local':None,'attempts':attempts}
out={}
with ThreadPoolExecutor(max_workers=20) as ex:
 fs=[ex.submit(fetch,p) for p in products]
 for i,f in enumerate(as_completed(fs),1):
  x=f.result(); out[str(x['id'])]=x
  if i%20==0: print({'completed':i,'total':len(products)},flush=True)
(root/'pages-10-17-product-main-results.json').write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps({'records':len(out),'localized':sum(bool(x['local']) for x in out.values()),'unresolved':sum(not x['local'] for x in out.values()),'low_score':sum(bool(x['local']) and (x['score'] or 0)<5 for x in out.values())}))
