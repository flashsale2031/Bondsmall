import json,re
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); target={201,205,210,216,219}; found={}; bad=[]
for f in sorted((root/'catalog-pages').glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']') if m else []
 for p in recs:
  pid=int(p.get('id',0))
  if pid not in target: continue
  imgs=p.get('images') or []; found[pid]=len(imgs)
  for rel in imgs:
   path=root/rel
   try:
    with Image.open(path) as im: im.verify()
   except Exception as e: bad.append({'id':pid,'path':rel,'error':str(e)})
summary={'target_records':len(target),'found_records':len(found),'gallery_sizes':found,'invalid_images':len(bad),'valid':len(found)==len(target) and not bad and all(v>=2 for v in found.values())}
(root/'manufacturer-gallery-validation.json').write_text(json.dumps({'summary':summary,'bad':bad},indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps(summary))
