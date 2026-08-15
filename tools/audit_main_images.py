import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; cat=root/'catalog-pages'; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
placeholder_terms=('transparent','placeholder','logo','default','no-image','no_image','missing','blank','pixel.gif','spacer.gif')
rows=[]; counts={'pages':0,'records':0,'missing':0,'placeholder':0,'local':0,'external':0,'main_equals_secondary':0}; samples=[]; bad_samples=[]; seen={}
for page in range(10,61578):
 f=cat/f'products-page-{page:05d}.js'; m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']'); recs=recs[0] if recs and isinstance(recs[0],list) else recs; counts['pages']+=1
 for p in recs:
  counts['records']+=1; img=p.get('image'); img=img[0] if isinstance(img,list) and img else img; s=str(img or '')
  bad=not s or any(t in s.lower() for t in placeholder_terms) or s.startswith('data:')
  if not s: counts['missing']+=1
  elif bad:
   counts['placeholder']+=1
   if len(bad_samples)<30: bad_samples.append({'page':page,'id':p.get('id'),'name':p.get('name'),'image':s,'source_url':p.get('source_url')})
  elif s.startswith('assets/'): counts['local']+=1
  else: counts['external']+=1
  imgs=p.get('images') or []
  if len(imgs)>1 and imgs[1]==s: counts['main_equals_secondary']+=1
  if bad or len(samples)<20 and page in (10,11,12,61577): samples.append({'page':page,'id':p.get('id'),'name':p.get('name'),'image':s,'source_url':p.get('source_url')})
(root/'main-image-audit-report.json').write_text(json.dumps({**counts,'samples':samples,'bad_samples':bad_samples},indent=2,ensure_ascii=False)); print(json.dumps({**counts,'bad_samples':bad_samples[:5]},indent=2,ensure_ascii=False))
