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
    if product.get('id') != 252:
        continue
    gallery = [
        'assets/manufacturer-images/252-gdfstudio-paolo-1.jpg',
        'assets/manufacturer-images/252-gdfstudio-paolo-2.jpg',
        'assets/manufacturer-images/252-gdfstudio-paolo-3.jpg',
        'assets/manufacturer-images/252-gdfstudio-paolo-4.jpg',
    ]
    source = 'https://www.target.com/p/gdfstudio-paolo-modern-rolling-kitchen-island-with-movable-table-cabinet-led-light-and-power-outlet/-/A-1008509369'
    product['image'] = gallery[0]
    product['images'] = gallery
    product['source_url'] = source
    product['secondary_image_source_url'] = source
    product['secondary_image_search_engine'] = 'target-product-gallery'
    product['secondary_image_match_confidence'] = 'exact-product-title-and-feature-match'
    product['secondary_image_storage'] = 'repository-local-gallery'
    product['secondary_image_local_path'] = gallery[1]
    product['gallery_normalized'] = 'gdfstudio-paolo-rolling-kitchen-island-four-image-gallery'
    product['main_image_search_engine'] = 'target-product-gallery'
    product['main_image_match_score'] = 100
    product['main_image_source_url'] = source
    product['image_verification_note'] = 'Gallery replaced with Target product-page imagery showing the GDFStudio Paolo rolling kitchen island, movable table, cabinet, LED light, power outlet, storage, and rolling design; verify current color variant and image-use permissions before Merchant Center publication.'
    updated += 1
    break
if updated != 1:
    raise SystemExit(f'expected_one_product_252_update_got_{updated}')
new_text = text[:match.start(1)] + json.dumps(products, separators=(',', ':'), ensure_ascii=False) + text[match.end(1):]
path.write_text(new_text, encoding='utf-8')
print('updated_product_id=252')
print('gallery_count=4')
