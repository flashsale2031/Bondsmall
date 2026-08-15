import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; cat=root/'catalog-pages'; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); changed=0
for n,f in enumerate(sorted(cat.glob('products-page-*.js')),1):
 m=pat.search(f.read_text(encoding='utf-8')); 
 if not m: raise SystemExit(f'parse failure: {f}')
 recs=json.loads('['+m.group(1)+']'); recs=recs[0] if recs and isinstance(recs[0],list) else recs
 payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk {f.stem.split("-")[-1]}\nwindow.products = window.products || [];\nwindow.products.push(...{payload});\n',encoding='utf-8'); changed+=1
 if n%5000==0: print({'chunks':n},flush=True)
print({'changed_chunks':changed})
