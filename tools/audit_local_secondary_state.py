import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; cat=root/'catalog-pages'; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); failed={x['url'] for x in json.loads((root/'secondary-url-availability.json').read_text()) if not x.get('ok')}; stats={'records':0,'two_images':0,'bad_images':0,'local_secondary':0,'failed_external_secondary':0,'other_external_secondary':0,'samples_failed':[]}
for page in range(11,61578):
 m=pat.search((cat/f'products-page-{page:05d}.js').read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']'); recs=recs[0] if recs and isinstance(recs[0],list) else recs
 for p in recs:
  stats['records']+=1; imgs=p.get('images') or []
  if len(imgs)==2 and all(isinstance(x,str) and x for x in imgs): stats['two_images']+=1
  else: stats['bad_images']+=1
  if len(imgs)>1:
   s=imgs[1]
   if s.startswith('assets/'): stats['local_secondary']+=1
   elif s in failed:
    stats['failed_external_secondary']+=1
    if len(stats['samples_failed'])<10: stats['samples_failed'].append({'id':p.get('id'),'name':p.get('name'),'url':s})
   else: stats['other_external_secondary']+=1
(root/'secondary-image-state-report.json').write_text(json.dumps(stats,indent=2,ensure_ascii=False)); print(json.dumps(stats,indent=2,ensure_ascii=False))
