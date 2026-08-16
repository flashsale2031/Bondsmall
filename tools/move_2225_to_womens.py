from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
PID=2225
MAIN='assets/mens/page2-main-corrections/2225.jpg'
ORIGINAL='assets/main-images/hf-684.jpg'
SOURCE='https://www.walmart.com/ip/Sweet-Treats-Crotchless-Boy-Short-w-Wicked-Sensual-Care-Peach-Lube-White-QN/9770768167'
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
found=False
for path in sorted((ROOT/'catalog-pages').glob('products-page-*.js')):
    m=pat.search(path.read_text(encoding='utf-8'))
    if not m: raise SystemExit(f'wrapper error: {path}')
    products=json.loads('['+m.group(1)+']'); changed=False
    for p in products:
        if p.get('id')==PID:
            p['category']='women'; p['gender']='Women'; p['image']=MAIN; p['images']=[MAIN,ORIGINAL]
            p['source_url']=SOURCE; p['main_image_source_url']=SOURCE; p['main_image_source_title']='Magic Silk Sweet Treats Crotchless Boy Short with Lube Peach Queen Size | Walmart'; p['main_image_source_search_engine']='Yahoo Images exact-product search'; p['secondary_image_source_url']='https://huggingface.co/datasets/Shopify/product-catalogue'; p['secondary_image_source_title']='Original catalog image retained as secondary display image'
            found=True; changed=True
    if changed:
        path.write_text('// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(...'+json.dumps(products,separators=(',',':'),ensure_ascii=False)+']);\n',encoding='utf-8')
if not found: raise SystemExit('product 2225 not found')
report={'id':PID,'category':'women','gender':'Women','main_image':MAIN,'secondary_image':ORIGINAL,'preserved_original_image':True}
(ROOT/'mens-2225-category-move-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
