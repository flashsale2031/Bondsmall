from pathlib import Path
import json
import re

path = Path('catalog-pages/products-page-00013.js')
text = path.read_text(encoding='utf-8')
match = re.search(r'window\.products\.push\(\.\.\.(\[.*\])\);?\s*$', text, re.S)
if not match:
    raise SystemExit('catalog_push_array_not_found')
products = json.loads(match.group(1))
updated = 0
for product in products:
    if product.get('id') != 260:
        continue
    gallery = [
        'assets/manufacturer-images/260-foodvacbags-rolls-1.png',
        'assets/manufacturer-images/260-foodvacbags-rolls-2.png',
        'assets/manufacturer-images/260-foodvacbags-rolls-3.png',
        'assets/manufacturer-images/260-foodvacbags-rolls-4.JPG',
    ]
    source = 'https://foodvacbags.com/products/8-x-50-black-back-clear-front-vacuum-sealer-roll'
    product['image'] = gallery[0]
    product['images'] = gallery
    product['source_url'] = source
    product['secondary_image_source_url'] = source
    product['secondary_image_search_engine'] = 'official-foodvacbags-product-gallery'
    product['secondary_image_match_confidence'] = 'exact-two-pack-dimensions-and-colorway-match'
    product['secondary_image_storage'] = 'repository-local-gallery'
    product['secondary_image_local_path'] = gallery[1]
    product['gallery_normalized'] = 'foodvacbags-two-8x50-black-clear-rolls-four-image-gallery'
    product['main_image_search_engine'] = 'official-foodvacbags-product-gallery'
    product['main_image_match_score'] = 100
    product['main_image_source_url'] = source
    product['image_verification_note'] = 'Gallery replaced with official FoodVacBags imagery for two 8-inch by 50-foot black-back/clear-front vacuum seal rolls; verify current stock and image-use permissions before Merchant Center publication.'
    updated += 1
    break
if updated != 1:
    raise SystemExit(f'expected_one_product_260_update_got_{updated}')
new_text = text[:match.start(1)] + json.dumps(products, separators=(',', ':'), ensure_ascii=False) + text[match.end(1):]
path.write_text(new_text, encoding='utf-8')
print('updated_product_id=260')
print('gallery_count=4')
