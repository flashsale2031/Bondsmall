import json
from pathlib import Path
data=json.loads(Path('/home/ubuntu/diagnose_Bondsmall/repo/indexed-image-research.json').read_text())
rows=[]
for x in data:
 a=x.get('accepted')
 if not a: continue
 evidence=(a.get('image_url','')+' '+a.get('source_url','')).lower()
 if x.get('asin','').lower() in evidence: rows.append(x)
print(json.dumps({'count':len(rows),'results':rows[:20]},indent=2,ensure_ascii=False))
