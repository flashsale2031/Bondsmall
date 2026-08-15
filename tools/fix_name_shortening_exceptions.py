import json,re
from pathlib import Path
from shorten_names_after_180 import shorten
root=Path(__file__).resolve().parents[1]; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); fixed=0; metadata=0; samples=[]
for f in sorted((root/'catalog-pages').glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']'); dirty=False
 for p in recs:
  if int(p.get('id',0))<=180: continue
  old=p.get('name',''); original=p.get('original_name')
  if not original:
   p['original_name']=old; metadata+=1; dirty=True
  new=shorten(old,p.get('source_url',''))
  if len(new)>48: new=' '.join(new.split()[:5])
  if new!=old:
   if len(samples)<20: samples.append({'id':p.get('id'),'old':old,'new':new})
   p['name']=new; fixed+=1; dirty=True
 if dirty:
  payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(...{payload});\n',encoding='utf-8')
print(json.dumps({'names_fixed':fixed,'original_name_metadata_added':metadata,'samples':samples}))
