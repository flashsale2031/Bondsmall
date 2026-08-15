import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; cat=root/'catalog-pages'; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); seen=set(); rows=[]
for page in range(10,61578):
 m=pat.search((cat/f'products-page-{page:05d}.js').read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']'); recs=recs[0] if recs and isinstance(recs[0],list) else recs
 for p in recs:
  img=p.get('image'); img=img[0] if isinstance(img,list) and img else img
  if isinstance(img,str) and img not in seen: seen.add(img); rows.append({'image':img,'name':p.get('name'),'source_url':p.get('source_url'),'id':p.get('id'),'page':page})
(root/'unique-main-image-records.json').write_text(json.dumps(rows,ensure_ascii=False),encoding='utf-8'); print({'unique_main_urls':len(rows)})
