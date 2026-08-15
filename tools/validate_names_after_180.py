import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); total=0; pages=0; ids=[]; bad=[]; long=[]; missing_original=[]; maxlen=0
for f in sorted((root/'catalog-pages').glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8'))
 if not m: bad.append({'file':f.name,'error':'syntax_or_payload'}); continue
 pages+=1
 try: recs=json.loads('['+m.group(1)+']')
 except Exception as e: bad.append({'file':f.name,'error':str(e)}); continue
 for p in recs:
  total+=1; pid=int(p.get('id',0)); ids.append(pid); name=str(p.get('name','')); maxlen=max(maxlen,len(name))
  if pid>180:
   if len(name)>48: long.append({'id':pid,'name':name,'length':len(name)})
   if not p.get('original_name'): missing_original.append(pid)
summary={'products':total,'pages':pages,'min_id':min(ids),'max_id':max(ids),'unique_ids':len(set(ids)),'duplicate_ids':total-len(set(ids)),'post_180':sum(i>180 for i in ids),'long_post_180':len(long),'missing_original_name':len(missing_original),'invalid_chunks':len(bad),'max_name_length':maxlen,'valid':total==1231539 and pages==61577 and len(set(ids))==total and not bad and not long and not missing_original}
(root/'names-after-180-validation-report.json').write_text(json.dumps({'summary':summary,'long':long[:100],'missing_original':missing_original[:100],'bad':bad[:100]},indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps(summary))
