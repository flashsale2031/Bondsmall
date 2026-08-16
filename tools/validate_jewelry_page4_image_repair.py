from pathlib import Path
import json,re
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
ids={329,330,331,332,336,337,338,339,340,341}; found={}; jewelry=[]
for path in sorted((ROOT/'catalog-pages').glob('products-page-*.js')):
    m=pat.search(path.read_text(encoding='utf-8'))
    if not m: raise SystemExit(f'wrapper error: {path}')
    for p in json.loads('['+m.group(1)+']'):
        if str(p.get('category','')).lower()=='jewelry': jewelry.append(p)
        if p.get('id') in ids: found[p['id']]=p
assert len(jewelry)>=80
assert [p['id'] for p in jewelry[60:80]] == [329,330,331,332,333,334,335,336,337,338,339,340,341,342,343,344,345,346,347,348]
checks=[]
for pid in sorted(ids):
    p=found[pid]; rel=p['image']; f=ROOT/rel
    assert f.exists(), (pid,rel)
    with Image.open(f) as im: assert im.width>=200 and im.height>=200, (pid,im.size)
    assert p['images'][0]==rel
    assert p.get('main_image_source_url','').startswith('http')
    checks.append({'id':pid,'name':p['name'],'image':rel,'source_url':p['main_image_source_url']})
print(json.dumps({'page':4,'page_records':20,'corrected_records':len(checks),'local_images_valid':True,'records':checks},indent=2,ensure_ascii=False))
