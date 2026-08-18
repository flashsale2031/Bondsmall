from pathlib import Path
import json
import re

path = Path('catalog-pages/products-page-00011.js')
text = path.read_text(encoding='utf-8')
match = re.search(r'window\.products\.push\(\.\.\.(\[.*\])\);?\s*$', text, re.S)
if not match:
    raise SystemExit('catalog_push_array_not_found')
products = json.loads(match.group(1))
updated = 0
for product in products:
    if product.get('id') != 221:
        continue
    gallery = [
        'assets/manufacturer-images/221-xbox-controller-headset-1.webp',
        'assets/manufacturer-images/221-xbox-controller-headset-2.webp',
        'assets/manufacturer-images/221-xbox-controller-headset-3.jpeg',
        'assets/manufacturer-images/221-xbox-controller-headset-4.jpeg',
    ]
    source = 'https://www.bestbuy.com/product/microsoft-xbox-series-x-s-controller-with-headset-black/JXG56QRCZ3'
    product['image'] = gallery[0]
    product['images'] = gallery
    product['source_url'] = source
    product['secondary_image_source_url'] = source
    product['secondary_image_search_engine'] = 'best-buy-product-gallery'
    product['secondary_image_match_confidence'] = 'exact-product-title-and-color-match'
    product['secondary_image_storage'] = 'repository-local-gallery'
    product['secondary_image_local_path'] = gallery[1]
    product['gallery_normalized'] = 'xbox-series-x-s-controller-with-headset-four-image-gallery'
    product['main_image_search_engine'] = 'best-buy-product-gallery'
    product['main_image_match_score'] = 100
    product['main_image_source_url'] = source
    product['image_verification_note'] = 'Gallery replaced with black Xbox Series X/S controller-and-headset bundle imagery matching the exact Best Buy product title; verify current model and image-use permissions before Merchant Center publication.'
    updated += 1
    break
if updated != 1:
    raise SystemExit(f'expected_one_product_221_update_got_{updated}')
new_text = text[:match.start(1)] + json.dumps(products, separators=(',', ':'), ensure_ascii=False) + text[match.end(1):]
path.write_text(new_text, encoding='utf-8')
print('updated_product_id=221')
print('gallery_count=4')
