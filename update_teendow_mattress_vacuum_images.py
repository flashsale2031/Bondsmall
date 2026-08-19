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
    if product.get('id') != 257:
        continue
    gallery = [
        'assets/manufacturer-images/257-teendow-mattress-vacuum-1.webp',
        'assets/manufacturer-images/257-teendow-mattress-vacuum-2.webp',
        'assets/manufacturer-images/257-teendow-mattress-vacuum-3.webp',
        'assets/manufacturer-images/257-teendow-mattress-vacuum-4.webp',
    ]
    source = 'https://www.target.com/p/teendow-500w-16kpa-vacuum-cleaner-with-uv-c-light-handheld-vacuums-with-heating-ultrasonic-anion-for-bed-dust-pet-hair-double-cup-purple/-/A-1000514564'
    product['image'] = gallery[0]
    product['images'] = gallery
    product['source_url'] = source
    product['secondary_image_source_url'] = source
    product['secondary_image_search_engine'] = 'target-product-gallery'
    product['secondary_image_match_confidence'] = 'exact-500w-16kpa-purple-uvc-heating-ultrasonic-double-cup-model-match'
    product['secondary_image_storage'] = 'repository-local-gallery'
    product['secondary_image_local_path'] = gallery[1]
    product['gallery_normalized'] = 'teendow-500w-uvc-mattress-vacuum-four-image-gallery'
    product['main_image_search_engine'] = 'target-product-gallery'
    product['main_image_match_score'] = 100
    product['main_image_source_url'] = source
    product['image_verification_note'] = 'Gallery replaced with Target product-page imagery showing the TEENDOW/UZK 500W 16Kpa purple-and-black mattress vacuum with 253.7nm UV-C, heating, ultrasonic/anion, anti-tangle brush, and double-cup features; verify current seller/model and image-use permissions before Merchant Center publication.'
    updated += 1
    break
if updated != 1:
    raise SystemExit(f'expected_one_product_257_update_got_{updated}')
new_text = text[:match.start(1)] + json.dumps(products, separators=(',', ':'), ensure_ascii=False) + text[match.end(1):]
path.write_text(new_text, encoding='utf-8')
print('updated_product_id=257')
print('gallery_count=4')
