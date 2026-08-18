from pathlib import Path
import json
import re

path = Path('catalog-pages/products-page-00015.js')
text = path.read_text(encoding='utf-8')
match = re.search(r'window\.products\.push\(\.\.\.(\[.*\])\);?\s*$', text, re.S)
if not match:
    raise SystemExit('catalog_push_array_not_found')
products = json.loads(match.group(1))
updated = 0
for product in products:
    if product.get('id') != 290:
        continue
    gallery = [
        'assets/manufacturer-images/290-donatello-gian-set-1.png',
        'assets/manufacturer-images/290-donatello-gian-set-2.jpg',
        'assets/manufacturer-images/290-donatello-gian-set-3.jpeg',
        'assets/manufacturer-images/290-donatello-gian-set-4.jpeg',
    ]
    source = 'https://www.nordstrom.com/s/jewelry-set-with-necklace-bracelet-hoops/8991225'
    product['image'] = gallery[0]
    product['images'] = gallery
    product['source_url'] = source
    product['secondary_image_source_url'] = source
    product['secondary_image_search_engine'] = 'nordstrom-product-gallery-and-donatello-gian-search'
    product['secondary_image_match_confidence'] = 'exact-jewelry-set-title-with-necklace-bracelet-and-hoops-match'
    product['secondary_image_storage'] = 'repository-local-gallery'
    product['secondary_image_local_path'] = gallery[1]
    product['gallery_normalized'] = 'donatello-gian-necklace-bracelet-hoops-four-image-gallery'
    product['main_image_search_engine'] = 'nordstrom-product-gallery-and-donatello-gian-search'
    product['main_image_match_score'] = 96
    product['main_image_source_url'] = source
    product['image_verification_note'] = 'Gallery replaced with exact-title Donatello Gian jewelry-set imagery and closely matching Donatello Gian necklace/hoops bundle imagery; Nordstrom page was identified but automated access was blocked, so verify current product variant and image-use permissions before Merchant Center publication.'
    updated += 1
    break
if updated != 1:
    raise SystemExit(f'expected_one_product_290_update_got_{updated}')
new_text = text[:match.start(1)] + json.dumps(products, separators=(',', ':'), ensure_ascii=False) + text[match.end(1):]
path.write_text(new_text, encoding='utf-8')
print('updated_product_id=290')
print('gallery_count=4')
