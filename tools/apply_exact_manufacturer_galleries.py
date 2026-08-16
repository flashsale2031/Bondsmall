import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; results=json.loads((root/'exact-manufacturer-gallery-results.json').read_text()); ids={int(k):v for k,v in results.items() if v.get('gallery')}; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); updated=0; samples=[]
for f in sorted((root/'catalog-pages').glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']') if m else []; dirty=False
 for p in recs:
  pid=int(p.get('id',0)); x=ids.get(pid)
  if not x: continue
  imgs=[g['path'] for g in x['gallery']]
  if imgs:
   p['images']=imgs; p['gallery']=imgs; updated+=1; dirty=True
   if len(samples)<20: samples.append({'id':pid,'name':p.get('name'),'images':len(imgs),'manufacturer_url':x['manufacturer_url']})
 if dirty:
  payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text('// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(...'+payload+');\n',encoding='utf-8')
(root/'manufacturer-gallery-apply-report.json').write_text(json.dumps({'updated_records':updated,'available_exact_matches':len(ids),'samples':samples},indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps({'updated_records':updated,'available_exact_matches':len(ids),'samples':samples}))
