import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); long=[]; unchanged=[]
for f in sorted((root/'catalog-pages').glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']')
 for p in recs:
  if int(p.get('id',0))<=180: continue
  if len(p.get('name',''))>48: long.append({'id':p['id'],'name':p['name'],'original':p.get('original_name')})
  if not p.get('original_name'): unchanged.append({'id':p['id'],'name':p['name']})
(root/'name-shortening-exceptions.json').write_text(json.dumps({'long':long,'unchanged':unchanged[:500]},indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps({'long':len(long),'unchanged':len(unchanged),'long_sample':long[:15],'unchanged_sample':unchanged[:15]}))
