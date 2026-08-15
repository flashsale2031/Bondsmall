import json,re,io
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); rows=[]
for page in range(10,18):
 f=root/'catalog-pages'/f'products-page-{page:05d}.js'; recs=json.loads('['+pat.search(f.read_text()).group(1)+']')
 for p in recs:
  imgs=p.get('images') or []
  checks=[]
  for u in imgs:
   ok=False
   if isinstance(u,str) and u.startswith('assets/'):
    q=root/u
    try: Image.open(q).verify(); ok=True
    except Exception: pass
   checks.append(ok)
  rows.append({'page':page,'id':p.get('id'),'name':p.get('name'),'gallery_count':len(imgs),'local_images':all(checks),'image_paths':imgs})
summary={'records':len(rows),'non_two_gallery':sum(x['gallery_count']!=2 for x in rows),'bad_local_gallery':sum(not x['local_images'] for x in rows),'by_page':{str(p):sum(1 for x in rows if x['page']==p and x['gallery_count']==2 and x['local_images']) for p in range(10,18)}}
(root/'pages-10-17-validation-report.json').write_text(json.dumps({'summary':summary,'records':rows},indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps(summary))
