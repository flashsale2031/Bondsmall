import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; CAT=ROOT/'catalog-pages'; research=json.loads((ROOT/'indexed-image-research.json').read_text())
by={x.get('asin'):x for x in research}; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
rows=[]; lengths={}; candidate=0; no_candidate=0
for f in sorted(CAT.glob('products-page-*.js')):
 page=int(f.stem.split('-')[-1]);
 if page<=10: continue
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']')
 if recs and isinstance(recs[0],list): recs=recs[0]
 for p in recs:
  imgs=p.get('images') if isinstance(p.get('images'),list) else []
  lengths[len(imgs)]=lengths.get(len(imgs),0)+1
  src=str(p.get('source_url','')); asin=src.split('/dp/',1)[1].split('?',1)[0].strip('/') if '/dp/' in src else ''
  row=by.get(asin,{})
  if row.get('candidates') or row.get('accepted'): candidate+=1
  else: no_candidate+=1
  if len(rows)<10: rows.append({'page':page,'id':p.get('id'),'name':p.get('name'),'image':p.get('image'),'images':imgs[:4],'asin':asin,'candidates':(row.get('candidates') or [])[:2]})
print(json.dumps({'pages':61577-10,'records':sum(lengths.values()),'gallery_length_distribution':lengths,'with_indexed_candidates':candidate,'without_indexed_candidates':no_candidate,'samples':rows},indent=2,ensure_ascii=False))
