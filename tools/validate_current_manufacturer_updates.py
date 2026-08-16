import json,re
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]; target={201,205,210,216,219,2441}; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); found={}; bad=[]
for f in sorted((root/'catalog-pages').glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']') if m else []
 for p in recs:
  pid=int(p.get('id',0))
  if pid not in target: continue
  imgs=p.get('images') or []; found[pid]={'name':p.get('name'),'count':len(imgs),'source':p.get('manufacturer_source_url') or p.get('main_image_source_url')}
  for rel in imgs:
   try:
    with Image.open(root/rel) as im: im.verify()
   except Exception as e: bad.append({'id':pid,'path':rel,'error':str(e)})
summary={'target_records':len(target),'found_records':len(found),'invalid_images':len(bad),'all_galleries_at_least_two':all(v['count']>=2 for v in found.values()),'valid':len(found)==len(target) and not bad and all(v['count']>=2 for v in found.values())}
(root/'current-manufacturer-update-validation.json').write_text(json.dumps({'summary':summary,'records':found,'bad':bad},indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps(summary))
