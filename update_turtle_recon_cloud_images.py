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
    if product.get('id') != 222:
        continue
    gallery = [
        'assets/manufacturer-images/222-turtle-recon-cloud-1.jpg',
        'assets/manufacturer-images/222-turtle-recon-cloud-2.jpg',
        'assets/manufacturer-images/222-turtle-recon-cloud-3.jpg',
        'assets/manufacturer-images/222-turtle-recon-cloud-4.jpg',
    ]
    source = 'https://www.bestbuy.com/product/turtle-beach-recon-cloud-wired-game-controller-with-bluetooth-for-xbox-series-xs-windows-android-with-remappable-buttons-black/JXK5HFZ97H'
    product['image'] = gallery[0]
    product['images'] = gallery
    product['source_url'] = source
    product['secondary_image_source_url'] = 'https://hk.turtlebeach.com/products/recon-cloud-controller'
    product['secondary_image_search_engine'] = 'official-turtle-beach-product-gallery'
    product['secondary_image_match_confidence'] = 'exact-model-and-black-color-match'
    product['secondary_image_storage'] = 'repository-local-gallery'
    product['secondary_image_local_path'] = gallery[1]
    product['gallery_normalized'] = 'turtle-beach-recon-cloud-black-four-image-gallery'
    product['main_image_search_engine'] = 'official-turtle-beach-product-gallery'
    product['main_image_match_score'] = 100
    product['main_image_source_url'] = 'https://hk.turtlebeach.com/products/recon-cloud-controller'
    product['image_verification_note'] = 'Gallery replaced with black Turtle Beach Recon Cloud controller imagery matching model TBS-0750-05; official product page confirms the Recon Cloud Controller family and black colorway. Verify current model and image-use permissions before Merchant Center publication.'
    updated += 1
    break
if updated != 1:
    raise SystemExit(f'expected_one_product_222_update_got_{updated}')
new_text = text[:match.start(1)] + json.dumps(products, separators=(',', ':'), ensure_ascii=False) + text[match.end(1):]
path.write_text(new_text, encoding='utf-8')
print('updated_product_id=222')
print('gallery_count=4')
