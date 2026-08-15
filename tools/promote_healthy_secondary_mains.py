import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; cat=root/'catalog-pages'; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); terms=('transparent','placeholder','logo','default','no-image','no_image','missing','blank','pixel.gif','spacer.gif'); stats={'pages':0,'records':0,'damaged_mains':0,'promoted':0,'unresolved':0,'samples':[]}
for page in range(10,61578):
 f=cat/f'products-page-{page:05d}.js'; m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']'); recs=recs[0] if recs and isinstance(recs[0],list) else recs
 for p in recs:
  stats['records']+=1; img=p.get('image'); img=img[0] if isinstance(img,list) and img else img; s=str(img or ''); bad=not s or any(t in s.lower() for t in terms) or s.startswith('data:')
  if bad:
   stats['damaged_mains']+=1; imgs=p.get('images') or []; candidates=[x for x in imgs[1:] if isinstance(x,str) and x and not any(t in x.lower() for t in terms) and not x.startswith('data:')]
   if candidates:
    new=candidates[0]; p['image']=new; p['images']=[new,new]; p['main_image_repair']='promoted-secondary-indexed-or-downloaded'; p['main_image_previous']=s; stats['promoted']+=1
    if len(stats['samples'])<15: stats['samples'].append({'id':p.get('id'),'name':p.get('name'),'new_main':new})
   else: stats['unresolved']+=1
 payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk {page}\nwindow.products = window.products || [];\nwindow.products.push(...[{payload}]);\n',encoding='utf-8'); stats['pages']+=1
 if page%2000==0: print(json.dumps({k:stats[k] for k in ('pages','damaged_mains','promoted','unresolved')}),flush=True)
(root/'main-image-promotion-report.json').write_text(json.dumps(stats,indent=2,ensure_ascii=False)); print(json.dumps(stats,indent=2,ensure_ascii=False))
