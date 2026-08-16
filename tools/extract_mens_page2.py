from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
items=[]
for path in sorted((ROOT/'catalog-pages').glob('products-page-*.js')):
    m=pat.search(path.read_text(encoding='utf-8'))
    if not m: raise SystemExit(f'wrapper error: {path}')
    for p in json.loads('['+m.group(1)+']'):
        if str(p.get('category','')).strip().lower()=='men':
            items.append({'category_position':len(items)+1,'catalog_chunk':path.name,'id':p.get('id'),'name':p.get('name'),'image':p.get('image'),'images':p.get('images',[]),'source_url':p.get('source_url'),'brand':(p.get('specifications') or {}).get('brand')})
out={'page':2,'page_size':20,'total_men':len(items),'records':items[20:40]}
(ROOT/'mens-page2-image-audit.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(out,indent=2,ensure_ascii=False))
