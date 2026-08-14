import json,requests,random
from pathlib import Path
p=json.loads(Path('/home/ubuntu/diagnose_Bondsmall/repo/approximate-image-application-report.json').read_text())
rows=p['matches'];
# stratify by score and sample deterministically
rows=sorted(rows,key=lambda x:(x['score'],x['id']))
sample=rows[:50]+rows[len(rows)//2:len(rows)//2+50]+rows[-50:]
out=[]
for x in sample:
 try:
  r=requests.get(x['image'],headers={'User-Agent':'Mozilla/5.0'},timeout=20,stream=True)
  out.append({**{k:x.get(k) for k in ['id','asin','engine','score','image','source_url']},'status':r.status_code,'content_type':r.headers.get('content-type'),'bytes':r.headers.get('content-length')})
 except Exception as e: out.append({**x,'status':0,'error':str(e)})
Path('/home/ubuntu/diagnose_Bondsmall/corrected-image-url-verification.json').write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'sampled':len(out),'http_200':sum(1 for x in out if x['status']==200),'non200':sum(1 for x in out if x['status']!=200),'image_types':sorted(set(str(x.get('content_type')) for x in out))},indent=2))
