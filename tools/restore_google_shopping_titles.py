import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; oldroot=Path('/tmp/bondsmall_pre_shortening/catalog-pages'); report={'records':0,'updated':0,'fallbacks':0,'truncated':0,'samples':[],'promotional_removed':0}
PROMO=re.compile(r'(?i)\b(?:free\s+shipping|fast\s+shipping|best\s+seller|limited\s+time|sale|clearance|deal|hot\s+sale|\d+\s*%\s*off)\b')
EMOJI=re.compile(r'[\U00010000-\U0010ffff]')

def title_format(name):
 s=EMOJI.sub('',str(name or '')); before=s
 s=re.sub(r'[\[\]{}<>*_#|]+',' ',s)
 s=PROMO.sub(' ',s)
 s=re.sub(r'\s+',' ',s).strip(' -–—,:;')
 # Avoid all-caps emphasis except short known abbreviations and model codes.
 if len(s)>3 and sum(c.isalpha() for c in s)==sum(1 for c in s if c.isupper()): s=s.title()
 if len(s)>150:
  report['truncated']+=1; s=s[:150].rsplit(' ',1)[0].rstrip(' -–—,:;')
 if len(s)<1: s=str(name or 'Product')[:150]
 if s!=before: report['promotional_removed']+=1
 return s

def parse(f):
 m=re.search(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',f.read_text(encoding='utf-8'),re.S)
 return json.loads('['+m.group(1)+']') if m else []
for cur in sorted((root/'catalog-pages').glob('products-page-*.js')):
 old=oldroot/cur.name; old_recs=parse(old); oldmap={int(p.get('id',0)):p.get('name','') for p in old_recs}; recs=parse(cur); dirty=False
 for p in recs:
  pid=int(p.get('id',0)); report['records']+=1
  if pid<=180: continue
  source=oldmap.get(pid)
  if not source:
   report['fallbacks']+=1; source=p.get('name','')
  new=title_format(source)
  if len(report['samples'])<40: report['samples'].append({'id':pid,'old_source_name':source,'new_title':new})
  if p.get('name')!=new: p['name']=new; report['updated']+=1; dirty=True
 if dirty:
  payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); cur.write_text('// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(...'+payload+');\n',encoding='utf-8')
(root/'google-shopping-title-restore-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps(report))
