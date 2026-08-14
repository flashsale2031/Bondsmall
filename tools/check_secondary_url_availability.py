import concurrent.futures,json,requests
from pathlib import Path
root=Path(__file__).resolve().parents[1]; urls=(root/'unique-secondary-image-urls.txt').read_text(encoding='utf-8').splitlines(); session=requests.Session()
def check(u):
 try:
  r=session.get(u,timeout=15,stream=True,headers={'User-Agent':'Mozilla/5.0'}); ct=r.headers.get('content-type',''); status=r.status_code; size=r.headers.get('content-length',''); r.close()
  ok=status<400 and ('image/' in ct or 'octet-stream' in ct)
  return {'url':u,'ok':ok,'status':status,'content_type':ct,'content_length':size}
 except Exception as e: return {'url':u,'ok':False,'status':0,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=32) as ex: results=list(ex.map(check,urls))
(root/'secondary-url-availability.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'total':len(results),'ok':sum(x['ok'] for x in results),'failed':sum(not x['ok'] for x in results)},indent=2))
