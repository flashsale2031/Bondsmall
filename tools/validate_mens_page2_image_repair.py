from pathlib import Path
import json,re
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
men=[]; found=None
for path in sorted((ROOT/'catalog-pages').glob('products-page-*.js')):
    m=pat.search(path.read_text(encoding='utf-8'))
    if not m: raise SystemExit(f'wrapper error: {path}')
    for p in json.loads('['+m.group(1)+']'):
        if str(p.get('category','')).lower()=='men': men.append(p)
        if p.get('id')==2225: found=p
assert [p.get('id') for p in men[20:40]][14]==2225
assert found is not None
rel=found['image']; f=ROOT/rel; assert f.exists()
with Image.open(f) as im: assert im.width>=200 and im.height>=200
assert found['images'][0]==rel
assert found['main_image_source_url'].startswith('https://www.walmart.com/')
print(json.dumps({'page':2,'total_men':len(men),'id':2225,'name':found['name'],'image':rel,'source_url':found['main_image_source_url'],'local_image_valid':True},indent=2))
