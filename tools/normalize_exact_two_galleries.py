import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; cat=root/'catalog-pages'; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); changed_pages=0; changed_records=0
for page in range(1,61578):
 f=cat/f'products-page-{page:05d}.js'; m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']'); recs=recs[0] if recs and isinstance(recs[0],list) else recs; changed=False
 for p in recs:
  main=p.get('image'); main=main[0] if isinstance(main,list) and main else main; main=str(main or ''); imgs=p.get('images') or []
  if len(imgs)==2: continue
  candidates=[x for x in imgs if isinstance(x,str) and x and x!=main and not x.startswith('http') or isinstance(x,str) and x and x!=main]
  side=candidates[0] if candidates else main
  p['image']=main; p['images']=[main,side]; p['gallery_normalized']='exactly-two-images'; changed=True; changed_records+=1
 if changed:
  payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk {f.stem.split("-")[-1]}\nwindow.products = window.products || [];\nwindow.products.push(...[{payload}]);\n',encoding='utf-8'); changed_pages+=1
print(json.dumps({'changed_pages':changed_pages,'changed_records':changed_records}))
