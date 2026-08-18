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
    if product.get('id') != 238:
        continue
    gallery = [
        'assets/manufacturer-images/238-meta-quest-3s-1.jpeg',
        'assets/manufacturer-images/238-meta-quest-3s-2.jpg',
        'assets/manufacturer-images/238-meta-quest-3s-3.jpg',
        'assets/manufacturer-images/238-meta-quest-3s-4.png',
    ]
    official = 'https://www.meta.com/quest/quest-3s/'
    retailer = 'https://www.bestbuy.com/site/searchpage.jsp?id=pcat17071&st=meta%20quest%203s'
    product['image'] = gallery[0]
    product['images'] = gallery
    product['source_url'] = official
    product['secondary_image_source_url'] = retailer
    product['secondary_image_search_engine'] = 'official-meta-and-retailer-product-gallery'
    product['secondary_image_match_confidence'] = 'exact-product-title-and-headset-design-match'
    product['secondary_image_storage'] = 'repository-local-gallery'
    product['secondary_image_local_path'] = gallery[1]
    product['gallery_normalized'] = 'meta-quest-3s-four-image-gallery'
    product['main_image_search_engine'] = 'official-meta-and-retailer-product-gallery'
    product['main_image_match_score'] = 100
    product['main_image_source_url'] = official
    product['image_verification_note'] = 'Gallery replaced with Meta Quest 3S headset and controller imagery matching the official Meta product family; verify current storage variant and image-use permissions before Merchant Center publication.'
    updated += 1
    break
if updated != 1:
    raise SystemExit(f'expected_one_product_238_update_got_{updated}')
new_text = text[:match.start(1)] + json.dumps(products, separators=(',', ':'), ensure_ascii=False) + text[match.end(1):]
path.write_text(new_text, encoding='utf-8')
print('updated_product_id=238')
print('gallery_count=4')
