import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; CAT=ROOT/'catalog-pages'; research=json.loads((ROOT/'indexed-image-research.json').read_text(encoding='utf-8')); by={x.get('asin'):x for x in research}
PAT=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
updated_chunks=0; records=0; indexed_secondary=0; existing_secondary=0; missing_secondary=0; report=[]
for f in sorted(CAT.glob('products-page-*.js')):
 page=int(f.stem.split('-')[-1])
 if page<=10: continue
 m=PAT.search(f.read_text(encoding='utf-8'))
 if not m: raise RuntimeError(f'bad wrapper {f}')
 recs=json.loads('['+m.group(1)+']')
 if recs and isinstance(recs[0],list): recs=recs[0]
 changed=False
 for p in recs:
  raw_primary=p.get('image')
  primary=raw_primary[0] if isinstance(raw_primary,list) and raw_primary else str(raw_primary or '')
  old=[x for x in (p.get('images') or []) if isinstance(x,str) and x.strip()]
  old=[x for x in old if x != primary]
  src=str(p.get('source_url','')); asin=src.split('/dp/',1)[1].split('?',1)[0].strip('/') if '/dp/' in src else ''
  row=by.get(asin,{})
  secondary=None; meta={}
  for c in row.get('candidates') or []:
   u=str(c.get('image_url','')).strip()
   if u and u != primary:
    secondary=u; meta={'secondary_image_source_url':c.get('source_url',''),'secondary_image_search_engine':c.get('engine','indexed'),'secondary_image_match_confidence':'approximate-indexed','secondary_image_match_score':c.get('score',0)}; break
  if secondary:
   indexed_secondary+=1
  elif old:
   secondary=old[0]; existing_secondary+=1; meta={'secondary_image_source_url':secondary,'secondary_image_search_engine':'existing-catalog-gallery','secondary_image_match_confidence':'existing-gallery'}
  else:
   secondary=primary; missing_secondary+=1; meta={'secondary_image_source_url':primary,'secondary_image_search_engine':'primary-duplicate-fallback','secondary_image_match_confidence':'fallback-duplicate'}
  p['image']=primary; p['images']=[primary,secondary]; p.update(meta); changed=True; records+=1
  if len(report)<25: report.append({'page':page,'id':p.get('id'),'name':p.get('name'),'image':primary,'secondary':secondary,'secondary_engine':meta['secondary_image_search_engine']})
 if changed:
  payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk {page}\nwindow.products = window.products || [];\nwindow.products.push(...[{payload}]);\n',encoding='utf-8'); updated_chunks+=1
(ROOT/'secondary-gallery-trim-report.json').write_text(json.dumps({'pages_after_10':61567,'chunks_updated':updated_chunks,'records':records,'indexed_secondary':indexed_secondary,'existing_secondary':existing_secondary,'missing_secondary':missing_secondary,'samples':report},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'chunks_updated':updated_chunks,'records':records,'indexed_secondary':indexed_secondary,'existing_secondary':existing_secondary,'missing_secondary':missing_secondary},indent=2))
