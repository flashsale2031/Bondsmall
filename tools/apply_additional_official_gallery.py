import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; data=json.loads((root/'additional-official-gallery-results.json').read_text()); ids={int(k):v for k,v in data.items() if len(v.get('gallery',[]))>=2}; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); updated=[]
for f in sorted((root/'catalog-pages').glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']') if m else []; dirty=False
 for p in recs:
  x=ids.get(int(p.get('id',0)))
  if not x: continue
  imgs=[g['path'] for g in x['gallery']]; p['name']=x['sourced_name']; p['images']=imgs; p['gallery']=imgs; p['manufacturer_source_url']=x['manufacturer_url']; p['manufacturer_gallery_match']='exact'; updated.append({'id':p['id'],'name':p['name'],'images':len(imgs)}); dirty=True
 if dirty:
  payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text('// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(...'+payload+');\n',encoding='utf-8')
(root/'additional-official-gallery-apply-report.json').write_text(json.dumps({'updated':updated,'skipped':sorted(int(k) for k,v in data.items() if len(v.get('gallery',[]))<2)},indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps({'updated':updated}))
