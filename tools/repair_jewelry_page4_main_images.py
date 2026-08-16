from pathlib import Path
import json,re,shutil
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCES={
329:('/home/ubuntu/upload/search_images/cpnRJ1eQWX0M.jpeg','Donatello Gian Sterling Silver Flower Earrings And Bracelet Set | Nordstrom','https://www.nordstrom.com/s/sterling-silver-flower-earrings-and-bracelet-set/8681605'),
330:('/home/ubuntu/upload/search_images/PO68ByqEOoaj.tif','The Lovery Square Link Ring 14K Gold - Gold | Macy’s','https://www.macys.com/shop/product/the-lovery-square-link-ring-14k-gold?ID=19538753'),
331:('/home/ubuntu/upload/search_images/vk6CNS9onx9W.jpeg','3-Piece Set Garnet Heart Necklace, Earrings & Ring | Nordstrom','https://www.nordstrom.com/s/julianna-b-3-piece-set-garnet-heart-necklace-earrings-ring/9259577'),
332:('/home/ubuntu/upload/search_images/F6pKGxodcgS8.jpeg','Arte Nova Jewellery Maisie Earrings | Nordstrom','https://www.nordstrom.com/s/maisie-earrings/8527873'),
336:('/home/ubuntu/upload/search_images/en0tYBqNK9cT.png','Constella stud earrings, Round cut, White, Rhodium plated | Swarovski','https://www.swarovski.com/en-US/p-M5692262/Constella-stud-earrings-Round-cut-White-Rhodium-plated/?variantID=5692262'),
337:('/home/ubuntu/upload/search_images/TmlPg3pUarjG.png','Swarovski Dextera ring, White, Rhodium plated','https://www.swarovski.com/en-US/p-M5668810/Dextera-ring-White-Rhodium-plated/?variantID=5695938'),
338:('/home/ubuntu/upload/search_images/5GnkkX8SMF0O.jpg','Semiprecious Beaded Charm Necklace | Madewell','https://www.madewell.com/p/OB569/'),
339:('/home/ubuntu/upload/search_images/JBnQsV2inlH7.jpg','Gold Hoop Earrings | Madewell','https://www.madewell.com/buy/gold-hoop-earrings-0aaz00a'),
340:('/home/ubuntu/upload/search_images/w9fruoMESmmu.jpg','Statement Gold Earrings | Madewell','https://www.madewell.com/buy/statement-gold-earrings-0acz02b'),
341:('/home/ubuntu/upload/search_images/ZnWcXZOwYT5R.jpg','Lia Tahitian Mother of Pearl Bangle | en route jewelry','https://enroutejewelry.com/products/lia-tahitian-mother-of-pearl-bangle'),
}
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
asset_dir=ROOT/'assets/jewelry/page4-main-corrections'; asset_dir.mkdir(parents=True,exist_ok=True)
local={}
for pid,(src,title,url) in SOURCES.items():
    source=Path(src)
    if not source.exists(): raise SystemExit(f'missing source image: {source}')
    dest=asset_dir/f'{pid}.jpg'
    with Image.open(source) as im:
        im.convert('RGB').save(dest,quality=94)
    local[pid]=f'assets/jewelry/page4-main-corrections/{pid}.jpg'
changed=[]
for path in sorted((ROOT/'catalog-pages').glob('products-page-*.js')):
    m=pat.search(path.read_text(encoding='utf-8'))
    if not m: raise SystemExit(f'wrapper error: {path}')
    products=json.loads('['+m.group(1)+']'); chunk_changed=False
    for p in products:
        pid=p.get('id')
        if pid in SOURCES:
            src,title,url=SOURCES[pid]; p['image']=local[pid]
            imgs=p.get('images') or []; p['images']=[local[pid]]+imgs[1:] if imgs else [local[pid]]
            p['main_image_source_url']=url; p['main_image_source_title']=title; p['main_image_source_search_engine']='Yahoo Images exact-product search'
            changed.append(pid); chunk_changed=True
    if chunk_changed:
        path.write_text('// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(...'+json.dumps(products,separators=(',',':'),ensure_ascii=False)+']);\n',encoding='utf-8')
(ROOT/'jewelry-page4-image-repair-report.json').write_text(json.dumps({'changed_ids':changed,'count':len(changed),'assets':local},indent=2)+'\n')
print(json.dumps({'changed_ids':changed,'count':len(changed),'assets':local},indent=2))
