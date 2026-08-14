import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'catalog-pages'
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
fixed=0
for f in sorted(root.glob('products-page-*.js')):
 text=f.read_text(encoding='utf-8'); m=pat.search(text)
 if not m: raise RuntimeError(f'bad wrapper {f}')
 recs=json.loads('['+m.group(1)+']')
 if recs and isinstance(recs[0],list):
  recs=recs[0]
  page=int(f.stem.split('-')[-1])
  payload=json.dumps(recs,ensure_ascii=False,separators=(',',':'))
  f.write_text(f'// Bondsmall page-sized catalog chunk {page}\nwindow.products = window.products || [];\nwindow.products.push(...{payload});\n',encoding='utf-8')
  fixed+=1
print('flattened',fixed)
