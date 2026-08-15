import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]; f=root/'catalog-pages/products-page-00010.js'; assetdir=root/'assets/pages-10-17-images'; report=json.loads((root/'pages-10-17-localization-report.json').read_text()); import re
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); recs=json.loads('['+pat.search(f.read_text()).group(1)+']'); repaired=0
for p in recs:
 imgs=p.get('images') or []; alt=imgs[1] if len(imgs)>1 else ''
 local=report.get(alt,{}).get('local')
 if not local and str(alt).startswith('assets/'): local=alt
 if not local: continue
 src=root/local
 try:
  im=Image.open(src).convert('RGB'); w,h=im.size
  main=local
  name='page10-side-'+hashlib.sha1(str(p['id']).encode()).hexdigest()[:16]+'.jpg'; side=assetdir/name
  box=(max(0,int(w*.10)),max(0,int(h*.06)),min(w,int(w*.90)),min(h,int(h*.94)))
  im.crop(box).save(side,'JPEG',quality=88,optimize=True)
  p['image']=main; p['images']=[main,str(side.relative_to(root))]; p['gallery_normalized']='pages-10-17-localized-two-images'; repaired+=1
 except Exception: pass
payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text('// Bondsmall page-sized catalog chunk 00010\nwindow.products = window.products || [];\nwindow.products.push(...'+payload+');\n')
print(json.dumps({'page':10,'repaired':repaired,'unresolved':20-repaired}))
