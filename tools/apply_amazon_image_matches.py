import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'catalog-pages'; mapping=json.loads((root.parent.parent/'amazon-title-image-recovery.json').read_text())
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
updated=0; matched=0
for f in sorted(root.glob('products-page-*.js')):
 text=f.read_text(encoding='utf-8'); m=pat.search(text)
 if not m: raise RuntimeError(f'bad wrapper {f}')
 recs=json.loads('['+m.group(1)+']')
 if recs and isinstance(recs[0],list): recs=recs[0]
 changed=False
 for p in recs:
  src=str(p.get('source_url',''))
  if '/dp/' not in src: continue
  asin=src.split('/dp/',1)[1].split('?',1)[0].strip('/')
  u=mapping.get(asin,{}).get('url')
  if not u: continue
  imgs=[x.strip() for x in (p.get('images') or []) if isinstance(x,str) and x.strip()]
  p['image']=u; p['images']=[u]+[x for x in imgs if x!=u]
  changed=True; matched+=1
 if changed:
  page=int(f.stem.split('-')[-1]); payload=json.dumps(recs,ensure_ascii=False,separators=(',',':'))
  f.write_text(f'// Bondsmall page-sized catalog chunk {page}\nwindow.products = window.products || [];\nwindow.products.push(...[{payload}]);\n',encoding='utf-8'); updated+=1
print(json.dumps({'chunks_updated':updated,'records_updated':matched}))
