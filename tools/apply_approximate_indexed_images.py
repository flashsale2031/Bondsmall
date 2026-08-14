import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; CAT=ROOT/'catalog-pages'
research=json.loads((ROOT/'indexed-image-research.json').read_text(encoding='utf-8'))
by_asin={x.get('asin'):x for x in research}
PAT=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
updated=0; matched=0; no_candidate=0; report=[]
for f in sorted(CAT.glob('products-page-*.js')):
    m=PAT.search(f.read_text(encoding='utf-8'))
    if not m: raise RuntimeError(f'bad wrapper {f}')
    recs=json.loads('['+m.group(1)+']')
    if recs and isinstance(recs[0],list): recs=recs[0]
    changed=False
    for p in recs:
        if int(p.get('id',0))<=160: continue
        src=str(p.get('source_url',''))
        if '/dp/' not in src: continue
        asin=src.split('/dp/',1)[1].split('?',1)[0].strip('/')
        row=by_asin.get(asin,{})
        choice=row.get('accepted') or ((row.get('candidates') or [None])[0])
        if not choice or not choice.get('image_url'): no_candidate+=1; continue
        img=choice['image_url'].strip()
        oldimgs=[x.strip() for x in (p.get('images') or []) if isinstance(x,str) and x.strip()]
        p['image']=img
        p['images']=[img]+[x for x in oldimgs if x!=img and 'bonds-mall-logo' not in x.lower() and '01rmk+j4pjl' not in x.lower()]
        p['image_source_url']=choice.get('source_url','')
        p['image_search_engine']=choice.get('engine','indexed')
        p['image_match_confidence']='approximate-indexed'
        p['image_match_score']=choice.get('score',0)
        matched+=1; changed=True
        report.append({'id':p.get('id'),'asin':asin,'name':p.get('name'),'image':img,'source_url':choice.get('source_url',''),'engine':choice.get('engine','indexed'),'score':choice.get('score',0)})
    if changed:
        page=int(f.stem.split('-')[-1]); payload=json.dumps(recs,ensure_ascii=False,separators=(',',':'))
        f.write_text(f'// Bondsmall page-sized catalog chunk {page}\nwindow.products = window.products || [];\nwindow.products.push(...[{payload}]);\n',encoding='utf-8'); updated+=1
(ROOT/'approximate-image-application-report.json').write_text(json.dumps({'chunks_updated':updated,'records_matched':matched,'records_without_candidate':no_candidate,'matches':report},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'chunks_updated':updated,'records_matched':matched,'records_without_candidate':no_candidate},indent=2))
