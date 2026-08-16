from pathlib import Path
import json,re
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
t=(ROOT/'catalog-pages/products-page-61577.js').read_text()
m=re.search(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',t,re.S)
arr=json.loads('['+m.group(1)+']')
p=next(x for x in arr if x.get('id')==1231542)
imgs=p['images']
assert len(imgs)>=2
for rel in imgs:
    f=ROOT/rel; assert f.exists(), rel
    with Image.open(f) as im: assert im.width>=200 and im.height>=200, (rel,im.size)
assert round(float(p['retail price'])*100)%100==99
assert round(float(p['sale price'])*100)%100==99
manifest=json.loads((ROOT/'catalog-pages/manifest.json').read_text())
idx=json.loads((ROOT/'catalog-category-index.js').read_text().split('=',1)[1].strip().rstrip(';'))
print(json.dumps({'id':p['id'],'name':p['name'],'category':p['category'],'gallery_count':len(imgs),'prices':[p['retail price'],p['sale price']],'manifest_total':manifest['totalRecords'],'men_index_count':idx['categories']['men']['count'],'local_images_valid':True},indent=2))
