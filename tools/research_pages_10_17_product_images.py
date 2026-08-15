import json,html
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parents[1]; rows=json.loads((root/'pages-10-17-products.json').read_text()); out={}

def research(p):
 urls=[]; errors=[]; source=p.get('source_url','')
 try:
  if source.startswith('http'):
   r=requests.get(source,timeout=25,headers={'User-Agent':'Mozilla/5.0'}); soup=BeautifulSoup(r.text,'html.parser')
   for sel in ('meta[property="og:image"]','meta[name="twitter:image"]'):
    x=soup.select_one(sel)
    if x and x.get('content'): urls.append(urljoin(source,html.unescape(x['content'])))
   for s in soup.find_all('script',type='application/ld+json'):
    try:
     d=json.loads(s.string or '')
     ds=d if isinstance(d,list) else [d]
     for x in ds:
      im=x.get('image') if isinstance(x,dict) else None
      if isinstance(im,str): urls.append(urljoin(source,im))
      elif isinstance(im,list): urls.extend(urljoin(source,i) for i in im if isinstance(i,str))
    except Exception: pass
   for x in soup.find_all('img')[:30]:
    u=x.get('src') or x.get('data-src') or x.get('data-original')
    if u: urls.append(urljoin(source,u))
 except Exception as e: errors.append(str(e)[:160])
 seen=[]
 for u in urls:
  if u.startswith('http') and u not in seen: seen.append(u)
 return {'page':p['page'],'id':p['id'],'name':p['name'],'source_url':source,'candidates':seen[:12],'errors':errors}
with ThreadPoolExecutor(max_workers=16) as ex:
 fs=[ex.submit(research,p) for p in rows]
 for i,f in enumerate(as_completed(fs),1):
  x=f.result(); out[str(x['id'])]=x
  if i%20==0: print({'completed':i,'total':len(rows)},flush=True)
(root/'pages-10-17-image-candidates.json').write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'records':len(out),'with_candidates':sum(bool(x['candidates']) for x in out.values()),'without_candidates':sum(not x['candidates'] for x in out.values())}))
