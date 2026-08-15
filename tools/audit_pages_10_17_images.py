import json,re,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]; out=[]
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
for page in range(10,18):
 f=root/'catalog-pages'/f'products-page-{page:05d}.js'
 recs=json.loads('['+pat.search(f.read_text(encoding='utf-8')).group(1)+']')
 for p in recs:
  imgs=p.get('images') or ([p.get('image')] if p.get('image') else [])
  out.append({'page':page,'id':p.get('id'),'name':p.get('name'),'main':p.get('image'),'gallery':imgs[:2],'gallery_count':len(imgs),'main_local':str(p.get('image','')).startswith('assets/'),'alternate_local':len(imgs)>1 and str(imgs[1]).startswith('assets/')})
summary={'pages':list(range(10,18)),'records':len(out),'non_two_gallery':sum(x['gallery_count']!=2 for x in out),'external_main':sum(not x['main_local'] for x in out),'external_alternate':sum(len(x['gallery'])>1 and not x['alternate_local'] for x in out),'placeholder_main':sum(any(s in str(x['main']).lower() for s in ('placeholder','transparent','expires=','huggingface','datasets-server')) for x in out),'placeholder_alternate':sum(any(s in str((x['gallery'][1] if len(x['gallery'])>1 else '')).lower() for s in ('placeholder','transparent','expires=','huggingface','datasets-server')) for x in out)}
(root/'pages-10-17-image-audit.json').write_text(json.dumps({'summary':summary,'records':out},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps(summary))
for x in out:
 if (not x['main_local']) or (len(x['gallery'])>1 and not x['alternate_local']): print(json.dumps(x,ensure_ascii=False))
