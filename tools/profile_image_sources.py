import json,re
from collections import Counter
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'catalog-pages'; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
dom=Counter(); imgdom=Counter(); missing=[]; examples={}
for f in sorted(root.glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']')
 for p in recs:
  if int(p.get('id',0))<=160: continue
  s=p.get('source_url','') or ''; i=p.get('image','') or ''
  ds=re.sub(r'^https?://([^/]+).*',r'\1',s) if s else 'no-source'
  di=re.sub(r'^https?://([^/]+).*',r'\1',i.lstrip('/')) if i else 'no-image'
  dom[ds]+=1; imgdom[di]+=1
  if ds not in examples: examples[ds]={'id':p.get('id'),'name':p.get('name'),'source_url':s,'image':i,'images0':(p.get('images') or [None])[0]}
print(json.dumps({'source_domains':dom.most_common(40),'image_domains':imgdom.most_common(40),'examples':dict(list(examples.items())[:40])},indent=2,ensure_ascii=False))
