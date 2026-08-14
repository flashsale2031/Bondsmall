import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'catalog-pages'; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
files=records=bad_len=bad_first=no_meta=indexed=existing=0
for page in range(11,61578):
 f=root/f'products-page-{page:05d}.js'; m=pat.search(f.read_text(encoding='utf-8'))
 recs=json.loads('['+m.group(1)+']')
 if recs and isinstance(recs[0],list): recs=recs[0]
 files+=1
 for p in recs:
  records+=1; imgs=p.get('images') if isinstance(p.get('images'),list) else []
  if len(imgs)!=2: bad_len+=1
  main=p.get('image'); main=main[0] if isinstance(main,list) and main else main
  if not imgs or imgs[0]!=main: bad_first+=1
  engine=p.get('secondary_image_search_engine')
  if not engine: no_meta+=1
  if engine in {'bing','google','yahoo'}: indexed+=1
  else: existing+=1
print(json.dumps({'files':files,'records':records,'bad_len':bad_len,'bad_first':bad_first,'no_meta':no_meta,'indexed':indexed,'existing':existing},indent=2))
