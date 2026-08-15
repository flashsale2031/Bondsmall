import json,hashlib,io
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import requests
from PIL import Image
root=Path(__file__).resolve().parents[1]; report=json.loads((root/'pages-10-17-image-audit.json').read_text())
outdir=root/'assets/pages-10-17-images'; outdir.mkdir(parents=True,exist_ok=True)
urls=[]
for r in report['records']:
 for u in r['gallery']:
  if u and u not in urls: urls.append(u)
def fetch(u):
 ext='.jpg'
 try:
  resp=requests.get(u,timeout=25,headers={'User-Agent':'Mozilla/5.0'},stream=True)
  data=resp.content
  if resp.status_code>=400: return u,None,f'HTTP {resp.status_code}'
  im=Image.open(io.BytesIO(data)); im.load();
  if im.width<80 or im.height<80: return u,None,f'small {im.size}'
  name=hashlib.sha1(u.encode()).hexdigest()[:16]+'.jpg'; path=outdir/name
  rgb=im.convert('RGB'); rgb.thumbnail((1000,1000)); rgb.save(path,'JPEG',quality=88,optimize=True)
  return u,str(path.relative_to(root)),None
 except Exception as e: return u,None,str(e)[:180]
results={}
with ThreadPoolExecutor(max_workers=16) as ex:
 fs=[ex.submit(fetch,u) for u in urls]
 for i,f in enumerate(as_completed(fs),1):
  u,p,e=f.result(); results[u]={'local':p,'error':e}
  if i%25==0: print({'completed':i,'total':len(urls)},flush=True)
(root/'pages-10-17-localization-report.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'unique_urls':len(urls),'localized':sum(bool(v['local']) for v in results.values()),'failed':sum(bool(v['error']) for v in results.values())}))
