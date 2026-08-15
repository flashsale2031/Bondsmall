import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; rows=[]; total=0
for f in sorted((root/'catalog-pages').glob('products-page-*.js')):
 m=re.search(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',f.read_text(encoding='utf-8'),re.S)
 if not m: continue
 for p in json.loads('['+m.group(1)+']'):
  if int(p.get('id',0))>180:
   total+=1
   if len(rows)<80: rows.append({'id':p.get('id'),'name':p.get('name'),'brand':p.get('brand'),'category':p.get('category'),'source_url':p.get('source_url','')})
(root/'names-after-180-sample.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps({'records_after_180':total,'sample_written':len(rows),'first':rows[:10]}))
