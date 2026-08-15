import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); removed=0
for f in sorted((root/'catalog-pages').glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']'); dirty=False
 for p in recs:
  if int(p.get('id',0))>180 and 'original_name' in p:
   del p['original_name']; removed+=1; dirty=True
 if dirty:
  payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(...{payload});\n',encoding='utf-8')
print(json.dumps({'metadata_removed':removed}))
