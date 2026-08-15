import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; results=json.loads((root/'pages-10-17-product-main-results.json').read_text()); pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); stats={'updated':0,'missing':[],'pages':{}}
for page in range(10,18):
 f=root/'catalog-pages'/f'products-page-{page:05d}.js'; recs=json.loads('['+pat.search(f.read_text()).group(1)+']')
 for p in recs:
  r=results.get(str(p.get('id'))); local=r.get('local') if r else None
  if not local: stats['missing'].append({'page':page,'id':p.get('id'),'name':p.get('name')}); continue
  old=p.get('images') or []; side=old[1] if len(old)>1 else local
  p['image']=local; p['images']=[local,side]; p['main_image_search_engine']=r.get('engine'); p['main_image_match_score']=r.get('score'); p['main_image_source_url']=r.get('url'); p['gallery_normalized']='product-specific-main-two-images'; stats['updated']+=1
 stats['pages'][str(page)]=len(recs); payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk {page:05d}\nwindow.products = window.products || [];\nwindow.products.push(...{payload});\n')
(root/'pages-10-17-product-main-apply-report.json').write_text(json.dumps(stats,indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps(stats))
