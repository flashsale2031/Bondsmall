import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); rows=[]
for page in range(10,18):
 f=root/'catalog-pages'/f'products-page-{page:05d}.js'; recs=json.loads('['+pat.search(f.read_text(encoding='utf-8')).group(1)+']')
 for p in recs:
  rows.append({'page':page,'id':p.get('id'),'name':p.get('name'),'description':p.get('description',''),'category':p.get('category'),'source_url':p.get('source_url',''),'sku':p.get('sku',''),'current_main':p.get('image'),'current_gallery':(p.get('images') or [])[:2]})
(root/'pages-10-17-products.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps({'records':len(rows),'pages':sorted(set(x['page'] for x in rows))}))
