import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); fixed=0
for f in sorted((root/'catalog-pages').glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']') if m else []; dirty=False
 for p in recs:
  if int(p.get('id',0)) not in (216,219): continue
  main=(p.get('images') or [None])[0]; alt=p.get('secondary_image_local_path') or p.get('secondary_image_url')
  if main and alt and main!=alt:
   p['images']=[main,alt]; p['gallery']=[main,alt]; p['gallery_normalized']='manufacturer-main-existing-local-alternate'; fixed+=1; dirty=True
 if dirty:
  payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text('// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(...'+payload+');\n',encoding='utf-8')
print(json.dumps({'fixed':fixed}))
