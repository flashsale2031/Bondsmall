import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'catalog-pages'; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
rows=[]
for f in sorted(root.glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']')
 for p in recs:
  if p.get('id',0)<=160: continue
  im=p.get('image'); imgs=p.get('images') or []
  primary=im[0] if isinstance(im,list) and im else im
  low=str(primary or '').lower()
  if not primary or 'bonds-mall-logo' in low or low.endswith('.gif') or 'placeholder' in low or (imgs and imgs[0] != primary and 'bonds-mall-logo' in str(imgs[0]).lower()):
   rows.append({'id':p.get('id'),'name':p.get('name'),'primary':primary,'images0':imgs[0] if imgs else None,'source_url':p.get('source_url')})
print(json.dumps(rows,indent=2,ensure_ascii=False))
