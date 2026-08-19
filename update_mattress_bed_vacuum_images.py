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
    if product.get('id') != 255:
        continue
    gallery = [
        'assets/manufacturer-images/255-mattress-bed-vacuum-1.webp',
        'assets/manufacturer-images/255-mattress-bed-vacuum-2.webp',
        'assets/manufacturer-images/255-mattress-bed-vacuum-3.webp',
        'assets/manufacturer-images/255-mattress-bed-vacuum-4.webp',
    ]
    source = 'https://www.target.com/p/550w-mattress-vacuum-cleaner-with-hepa-filter-hot-air-dual-dust-bin-for-bed-sofa-cleaning/-/A-1008278667'
    product['image'] = gallery[0]
    product['images'] = gallery
    product['source_url'] = source
    product['secondary_image_source_url'] = source
    product['secondary_image_search_engine'] = 'target-product-gallery'
    product['secondary_image_match_confidence'] = 'exact-550w-hepa-hot-air-dual-dust-bin-model-match'
    product['secondary_image_storage'] = 'repository-local-gallery'
    product['secondary_image_local_path'] = gallery[1]
    product['gallery_normalized'] = '550w-mattress-bed-vacuum-hepa-four-image-gallery'
    product['main_image_search_engine'] = 'target-product-gallery'
    product['main_image_match_score'] = 100
    product['main_image_source_url'] = source
    product['image_verification_note'] = 'Gallery replaced with Target product-page imagery showing the exact white 550W mattress and bed vacuum with HEPA filtration, hot-air function, dual dust bins, roller brush, and blue-light cleaning features; verify current seller/model and image-use permissions before Merchant Center publication.'
    updated += 1
    break
if updated != 1:
    raise SystemExit(f'expected_one_product_255_update_got_{updated}')
new_text = text[:match.start(1)] + json.dumps(products, separators=(',', ':'), ensure_ascii=False) + text[match.end(1):]
path.write_text(new_text, encoding='utf-8')
print('updated_product_id=255')
print('gallery_count=4')
