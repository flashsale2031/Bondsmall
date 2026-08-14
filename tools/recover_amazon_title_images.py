import json,re,html,concurrent.futures
from pathlib import Path
import requests
root=Path(__file__).resolve().parents[1]/'catalog-pages'; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
placeholder='01RmK+J4pJL._AC_.gif'.lower(); seen={}
for f in sorted(root.glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']')
 for p in recs:
  if int(p.get('id',0))<=160: continue
  if not str(p.get('source_url','')).startswith('https://www.amazon.com/dp/'): continue
  if placeholder in str(p.get('image','')).lower():
   asin=p['source_url'].split('/dp/',1)[1].split('?',1)[0].strip('/'); seen.setdefault(asin,{'id':p.get('id'),'name':p.get('name')})
print('unique_asins',len(seen))

def one(item):
 asin,meta=item
 try:
  r=requests.get('https://r.jina.ai/http://www.amazon.com/dp/'+asin,headers={'User-Agent':'Mozilla/5.0'},timeout=60)
  text=html.unescape(r.text)
  tokens=[x for x in re.findall(r'[a-z0-9]{3,}',str(meta['name']).lower()) if x not in {'and','the','for','with','from','this','that','pack','set'}]
  best=[]
  for line in text.splitlines():
   low=line.lower()
   score=sum(1 for t in tokens if t in low)
   if score < max(3,min(8,len(tokens))): continue
   urls=re.findall(r'https://(?:m\.media-amazon\.com|images-na\.ssl-images-amazon\.com)/images/I/[^)\s]+',line)
   for u in urls:
    if '.gif' not in u.lower() and '/G/' not in u and 'transparent' not in u.lower() and 'pixel' not in u.lower(): best.append((score,u))
  best=sorted(set(best),reverse=True)
  return asin,{'id':meta['id'],'name':meta['name'],'url':best[0][1] if best else None,'score':best[0][0] if best else 0,'status':r.status_code}
 except Exception as e: return asin,{'id':meta['id'],'name':meta['name'],'url':None,'score':0,'error':str(e)}

out={}; done=0
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
 for asin,res in ex.map(one,seen.items()):
  out[asin]=res; done+=1
  if done%100==0: print('done',done,flush=True)
Path('/home/ubuntu/diagnose_Bondsmall/amazon-title-image-recovery.json').write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding='utf-8')
found=sum(1 for v in out.values() if v.get('url'))
print('found',found,'unresolved',len(out)-found)
