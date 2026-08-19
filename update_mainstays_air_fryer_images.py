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
    if product.get('id') != 254:
        continue
    gallery = [
        'assets/manufacturer-images/254-mainstays-8qt-air-fryer-1.webp',
        'assets/manufacturer-images/254-mainstays-8qt-air-fryer-3.webp',
        'assets/manufacturer-images/254-mainstays-8qt-air-fryer-5.webp',
        'assets/manufacturer-images/254-mainstays-8qt-air-fryer-6.webp',
    ]
    source = 'https://www.walmart.com/ip/Mainstays-8-qt-Air-Fryer-Black-Automatic-Shutoff/5162100422'
    product['image'] = gallery[0]
    product['images'] = gallery
    product['source_url'] = source
    product['secondary_image_source_url'] = source
    product['secondary_image_search_engine'] = 'walmart-product-gallery'
    product['secondary_image_match_confidence'] = 'exact-product-title-brand-size-and-black-colorway-match'
    product['secondary_image_storage'] = 'repository-local-gallery'
    product['secondary_image_local_path'] = gallery[1]
    product['gallery_normalized'] = 'mainstays-8qt-air-fryer-four-image-gallery'
    product['main_image_search_engine'] = 'walmart-product-gallery'
    product['main_image_match_score'] = 100
    product['main_image_source_url'] = source
    product['image_verification_note'] = 'Gallery replaced with Walmart title-matched Mainstays 8-Qt Air Fryer imagery showing the black unit, packaging, basket, and product views; verify current model and image-use permissions before Merchant Center publication.'
    updated += 1
    break
if updated != 1:
    raise SystemExit(f'expected_one_product_254_update_got_{updated}')
new_text = text[:match.start(1)] + json.dumps(products, separators=(',', ':'), ensure_ascii=False) + text[match.end(1):]
path.write_text(new_text, encoding='utf-8')
print('updated_product_id=254')
print('gallery_count=4')
