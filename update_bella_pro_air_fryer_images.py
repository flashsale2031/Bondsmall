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
    if product.get('id') != 246:
        continue
    gallery = [
        'assets/manufacturer-images/246-bella-pro-air-fryer-1.webp',
        'assets/manufacturer-images/246-bella-pro-air-fryer-2.webp',
        'assets/manufacturer-images/246-bella-pro-air-fryer-3.webp',
        'assets/manufacturer-images/246-bella-pro-air-fryer-4.webp',
    ]
    official = 'https://bellakitchenware.com/shop/products/bella-pro-smartcrisp-8qt-air-fryer/'
    retailer = 'https://www.bestbuy.com/product/bella-pro-8-qt-touchscreen-air-fryer-with-divided-basket-matte-black/J3P5RSSW46'
    product['image'] = gallery[0]
    product['images'] = gallery
    product['source_url'] = retailer
    product['secondary_image_source_url'] = official
    product['secondary_image_search_engine'] = 'official-bella-and-retailer-product-gallery'
    product['secondary_image_match_confidence'] = 'exact-product-title-color-and-divided-basket-match'
    product['secondary_image_storage'] = 'repository-local-gallery'
    product['secondary_image_local_path'] = gallery[1]
    product['gallery_normalized'] = 'bella-pro-8-qt-touchscreen-air-fryer-four-image-gallery'
    product['main_image_search_engine'] = 'official-bella-and-retailer-product-gallery'
    product['main_image_match_score'] = 100
    product['main_image_source_url'] = retailer
    product['image_verification_note'] = 'Gallery replaced with matte-black bella PRO 8-qt touchscreen air fryer and divided-basket imagery matching the exact retailer product title; verify current model and image-use permissions before Merchant Center publication.'
    updated += 1
    break
if updated != 1:
    raise SystemExit(f'expected_one_product_246_update_got_{updated}')
new_text = text[:match.start(1)] + json.dumps(products, separators=(',', ':'), ensure_ascii=False) + text[match.end(1):]
path.write_text(new_text, encoding='utf-8')
print('updated_product_id=246')
print('gallery_count=4')
