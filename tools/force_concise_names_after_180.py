import json,re
from pathlib import Path
from shorten_names_after_180 import shorten
root=Path(__file__).resolve().parents[1]; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); fixed=0; samples=[]
for f in sorted((root/'catalog-pages').glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']'); dirty=False
 for p in recs:
  if int(p.get('id',0))<=180: continue
  old=p.get('name','')
  if len(old)<=48: continue
  new=shorten(old,p.get('source_url',''))
  # Guarantee a short display name even for malformed or non-English source titles.
  if len(new)>48:
   words=new.split(); acc=[]
   for w in words:
    candidate=' '.join(acc+[w])
    if len(candidate)>48: break
    acc.append(w)
   new=' '.join(acc) or new[:48].rstrip()
  if len(new)>48: new=new[:48].rstrip()
  if new!=old:
   if len(samples)<30: samples.append({'id':p.get('id'),'old':old,'new':new})
   p['name']=new; fixed+=1; dirty=True
 if dirty:
  payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(...{payload});\n',encoding='utf-8')
print(json.dumps({'fixed':fixed,'samples':samples}))
