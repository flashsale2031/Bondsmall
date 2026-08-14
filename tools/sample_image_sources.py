import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'catalog-pages'; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
want=['www.amazon.com','huggingface.co','www.asos.com','baublebar.com','gorjana.com','missoma.com','enroutejewelry.com']
seen={d:0 for d in want}; out={d:[] for d in want}
for f in sorted(root.glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']')
 for p in recs:
  if p.get('id',0)<=160: continue
  s=p.get('source_url','') or ''
  d=re.sub(r'^https?://([^/]+).*',r'\1',s) if s else ''
  if d in seen:
   seen[d]+=1
   if len(out[d])<8: out[d].append({'id':p.get('id'),'name':p.get('name'),'source_url':s,'image':p.get('image'),'images0':(p.get('images') or [None])[0]})
print(json.dumps({'counts_seen':seen,'samples':out},indent=2,ensure_ascii=False))
