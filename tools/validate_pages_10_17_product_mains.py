import json,re
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); rows=[]
for page in range(10,18):
 f=root/'catalog-pages'/f'products-page-{page:05d}.js'; recs=json.loads('['+pat.search(f.read_text()).group(1)+']')
 for p in recs:
  imgs=p.get('images') or []; good=[]
  for u in imgs:
   ok=False
   if isinstance(u,str) and u.startswith('assets/'):
    try: Image.open(root/u).verify(); ok=True
    except Exception: pass
   good.append(ok)
  rows.append({'page':page,'id':p.get('id'),'name':p.get('name'),'main':p.get('image'),'gallery':imgs,'ok':len(imgs)==2 and all(good),'engine':p.get('main_image_search_engine'),'score':p.get('main_image_match_score')})
summary={'records':len(rows),'valid_two_local_galleries':sum(x['ok'] for x in rows),'invalid':sum(not x['ok'] for x in rows),'unique_mains':len(set(x['main'] for x in rows)),'manual_indexed':sum(x['engine']=='manual-indexed' for x in rows),'by_page':{str(p):sum(x['ok'] for x in rows if x['page']==p) for p in range(10,18)}}
(root/'pages-10-17-product-main-validation.json').write_text(json.dumps({'summary':summary,'records':rows},indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps(summary))
