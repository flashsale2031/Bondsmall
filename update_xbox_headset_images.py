from pathlib import Path
import json
import re

path = Path('catalog-pages/products-page-00012.js')
text = path.read_text(encoding='utf-8')
match = re.search(r'window\.products\.push\(\.\.\.(\[.*\])\);?\s*$', text, re.S)
if not match:
    raise SystemExit('catalog_push_array_not_found')
products = json.loads(match.group(1))
updated = 0
for product in products:
    if product.get('id') != 223:
        continue
    gallery = [
        'assets/manufacturer-images/223-xbox-wireless-headset-1.webp',
        'assets/manufacturer-images/223-xbox-wireless-headset-2.webp',
        'assets/manufacturer-images/223-xbox-wireless-headset-3.webp',
        'assets/manufacturer-images/223-xbox-wireless-headset-4.webp',
    ]
    product['image'] = gallery[0]
    product['images'] = gallery
    product['source_url'] = 'https://www.xbox.com/en-US/accessories/headsets/xbox-wireless-headset'
    product['secondary_image_source_url'] = product['source_url']
    product['secondary_image_search_engine'] = 'official-xbox-product-gallery'
    product['secondary_image_match_confidence'] = 'official-product-family-match'
    product['secondary_image_storage'] = 'repository-local-gallery'
    product['secondary_image_local_path'] = gallery[1]
    product['gallery_normalized'] = 'official-xbox-wireless-headset-four-image-gallery'
    product['main_image_search_engine'] = 'official-xbox-product-gallery'
    product['main_image_match_score'] = 100
    product['main_image_source_url'] = product['source_url']
    product['image_verification_note'] = 'Gallery replaced with official Xbox Wireless Headset imagery matching the Microsoft TLL-00020 product family; verify current model and image-use permissions before Merchant Center publication.'
    updated += 1
    break
if updated != 1:
    raise SystemExit(f'expected_one_product_223_update_got_{updated}')
new_text = text[:match.start(1)] + json.dumps(products, separators=(',', ':'), ensure_ascii=False) + text[match.end(1):]
path.write_text(new_text, encoding='utf-8')
print('updated_product_id=223')
print('gallery_count=4')
