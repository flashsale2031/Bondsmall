import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); total=pages=0; ids=[]; invalid=[]; bad=[]; promo=re.compile(r'(?i)\b(?:free\s+shipping|fast\s+shipping|best\s+seller|limited\s+time|sale|clearance|deal|hot\s+sale|\d+\s*%\s*off)\b')
for f in sorted((root/'catalog-pages').glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8'))
 if not m: invalid.append(f.name); continue
 pages+=1
 try: recs=json.loads('['+m.group(1)+']')
 except Exception: invalid.append(f.name); continue
 for p in recs:
  total+=1; pid=int(p.get('id',0)); ids.append(pid); n=str(p.get('name',''))
  if pid>180 and (not 1<=len(n)<=150 or promo.search(n) or '<' in n or '>' in n): bad.append({'id':pid,'name':n,'length':len(n)})
summary={'products':total,'pages':pages,'min_id':min(ids),'max_id':max(ids),'unique_ids':len(set(ids)),'duplicate_ids':total-len(set(ids)),'post_180':sum(x>180 for x in ids),'invalid_chunks':len(invalid),'title_violations':len(bad),'valid':total==1231539 and pages==61577 and len(set(ids))==total and not invalid and not bad}
(root/'google-shopping-title-validation.json').write_text(json.dumps({'summary':summary,'violations':bad[:100],'invalid':invalid[:100]},indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps(summary))
