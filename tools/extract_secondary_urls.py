import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'catalog-pages'; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); seen=set(); out=[]
for page in range(11,61578):
 f=root/f'products-page-{page:05d}.js'; m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']')
 if recs and isinstance(recs[0],list): recs=recs[0]
 for p in recs:
  imgs=p.get('images') or []
  if len(imgs)>1 and isinstance(imgs[1],str) and imgs[1] not in seen:
   seen.add(imgs[1]); out.append(imgs[1])
(Path(__file__).resolve().parents[1]/'unique-secondary-image-urls.txt').write_text('\n'.join(out)+'\n',encoding='utf-8')
print({'unique_secondary_urls':len(out)})
