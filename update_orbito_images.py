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
    if product.get('id') != 235:
        continue
    gallery = [
        'assets/manufacturer-images/235-orbito-1.jpg',
        'assets/manufacturer-images/235-orbito-2.jpeg',
        'assets/manufacturer-images/235-orbito-3.jpg',
        'assets/manufacturer-images/235-orbito-4.jpg',
    ]
    official = 'https://flexiqgames.com/en/product/orbito/'
    retailer = 'https://www.walmart.com/ip/Orbito-Board-Game-Strategy-Game-for-Kids-and-Adults-Fun-Family-Game-Night-Entertainment/5321227131'
    product['image'] = gallery[0]
    product['images'] = gallery
    product['source_url'] = official
    product['secondary_image_source_url'] = retailer
    product['secondary_image_search_engine'] = 'official-flexiq-and-retailer-product-gallery'
    product['secondary_image_match_confidence'] = 'exact-product-title-and-game-component-match'
    product['secondary_image_storage'] = 'repository-local-gallery'
    product['secondary_image_local_path'] = gallery[1]
    product['gallery_normalized'] = 'orbito-strategy-board-game-four-image-gallery'
    product['main_image_search_engine'] = 'official-flexiq-and-retailer-product-gallery'
    product['main_image_match_score'] = 100
    product['main_image_source_url'] = official
    product['image_verification_note'] = 'Gallery replaced with Orbito board, marbles, packaging, and gameplay imagery matching the FlexiQ Orbito product family; verify current model and image-use permissions before Merchant Center publication.'
    updated += 1
    break
if updated != 1:
    raise SystemExit(f'expected_one_product_235_update_got_{updated}')
new_text = text[:match.start(1)] + json.dumps(products, separators=(',', ':'), ensure_ascii=False) + text[match.end(1):]
path.write_text(new_text, encoding='utf-8')
print('updated_product_id=235')
print('gallery_count=4')
