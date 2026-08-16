from pathlib import Path
import json,re
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
PID=2225
SRC=Path('/home/ubuntu/upload/search_images/ES4vHZxo1bql.jpeg')
DEST=ROOT/'assets/mens/page2-main-corrections/2225.jpg'
SOURCE_URL='https://www.walmart.com/ip/Sweet-Treats-Crotchless-Boy-Short-w-Wicked-Sensual-Care-Peach-Lube-White-QN/9770768167'
SOURCE_TITLE='Magic Silk Sweet Treats Crotchless Boy Short with Lube Peach Queen Size | Walmart'
if not SRC.exists(): raise SystemExit(f'missing source image: {SRC}')
DEST.parent.mkdir(parents=True,exist_ok=True)
with Image.open(SRC) as im: im.convert('RGB').save(DEST,quality=94)
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
found=False
for path in sorted((ROOT/'catalog-pages').glob('products-page-*.js')):
    m=pat.search(path.read_text(encoding='utf-8'))
    if not m: raise SystemExit(f'wrapper error: {path}')
    products=json.loads('['+m.group(1)+']'); changed=False
    for p in products:
        if p.get('id')==PID:
            p['image']='assets/mens/page2-main-corrections/2225.jpg'; imgs=p.get('images') or []; p['images']=['assets/mens/page2-main-corrections/2225.jpg']+imgs[1:] if imgs else ['assets/mens/page2-main-corrections/2225.jpg']; p['source_url']=SOURCE_URL; p['main_image_source_url']=SOURCE_URL; p['main_image_source_title']=SOURCE_TITLE; p['main_image_source_search_engine']='Yahoo Images exact-product search'; found=True; changed=True
    if changed:
        path.write_text('// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(...'+json.dumps(products,separators=(',',':'),ensure_ascii=False)+']);\n',encoding='utf-8')
if not found: raise SystemExit(f'product not found: {PID}')
report={'id':PID,'replacement':'assets/mens/page2-main-corrections/2225.jpg','source_url':SOURCE_URL,'source_title':SOURCE_TITLE}
(ROOT/'mens-page2-image-repair-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
