import json,re,html,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from urllib.parse import quote
import requests
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parents[1]; products=json.loads((root/'pages-10-17-products.json').read_text()); existing=json.loads((root/'pages-10-17-image-candidates.json').read_text()) if (root/'pages-10-17-image-candidates.json').exists() else {}

def bing(q):
 out=[]
 try:
  s=BeautifulSoup(requests.get('https://www.bing.com/images/search?q='+quote(q),timeout=25,headers={'User-Agent':'Mozilla/5.0'}).text,'html.parser')
  for a in s.select('a.iusc')[:12]:
   m=a.get('m') or ''
   x=re.search(r'"murl":"(.*?)"',m)
   t=re.search(r'"turl":"(.*?)"',m)
   if x: out.append({'engine':'bing','url':html.unescape(x.group(1)).replace('\\/','/'),'title':html.unescape(a.get('aria-label','')),'thumb':t.group(1) if t else ''})
 except Exception: pass
 return out

def google(q):
 out=[]
 try:
  s=BeautifulSoup(requests.get('https://www.google.com/search?tbm=isch&q='+quote(q),timeout=25,headers={'User-Agent':'Mozilla/5.0'}).text,'html.parser')
  for img in s.select('img'):
   u=img.get('src','')
   if u.startswith('http'): out.append({'engine':'google','url':u,'title':img.get('alt',''),'thumb':u})
 except Exception: pass
 return out

def yahoo(q):
 out=[]
 try:
  s=BeautifulSoup(requests.get('https://images.search.yahoo.com/search/images?p='+quote(q),timeout=25,headers={'User-Agent':'Mozilla/5.0'}).text,'html.parser')
  for a in s.select('a.img')[:12]:
   u=a.get('data-src') or a.get('href','')
   if u.startswith('http'): out.append({'engine':'yahoo','url':u,'title':a.get('alt',''),'thumb':u})
 except Exception: pass
 return out

def run(p):
 q=p['name']+' product'
 candidates=[]
 for fn in (bing,google,yahoo): candidates.extend(fn(q))
 return {'page':p['page'],'id':p['id'],'name':p['name'],'query':q,'candidates':candidates[:24]}
out={}
with ThreadPoolExecutor(max_workers=12) as ex:
 fs=[ex.submit(run,p) for p in products if not existing.get(str(p['id']),{}).get('candidates')]
 for i,f in enumerate(as_completed(fs),1):
  x=f.result(); out[str(x['id'])]=x
  if i%20==0: print({'completed':i,'total':len(fs)},flush=True)
(root/'pages-10-17-indexed-candidates.json').write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps({'searched':len(out),'with_candidates':sum(bool(x['candidates']) for x in out.values())}))
