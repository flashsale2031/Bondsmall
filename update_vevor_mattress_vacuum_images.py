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
    if product.get('id') != 256:
        continue
    gallery = [
        'assets/manufacturer-images/256-vevor-mattress-vacuum-1.jpg',
        'assets/manufacturer-images/256-vevor-mattress-vacuum-2.jpg',
        'assets/manufacturer-images/256-vevor-mattress-vacuum-3.jpg',
        'assets/manufacturer-images/256-vevor-mattress-vacuum-4.jpg',
    ]
    source = 'https://www.target.com/p/vevor-mattress-vacuum-cleaner-550w-bed-vacuum-cleaner-with-18kpa-powerful-suction-and-dual-dust-bin-hepa-filter-heating-white/-/A-1008814049'
    official = 'https://www.vevor.com/vacuum-cleaner-c_11407/mattress-vacuum-cleaner-with-18kpa-powerful-suction-hepa-filter-550w-white-p_010281431375'
    product['image'] = gallery[0]
    product['images'] = gallery
    product['source_url'] = source
    product['secondary_image_source_url'] = official
    product['secondary_image_search_engine'] = 'target-and-vevor-product-gallery'
    product['secondary_image_match_confidence'] = 'exact-550w-18kpa-white-dual-dust-bin-hepa-heating-model-match'
    product['secondary_image_storage'] = 'repository-local-gallery'
    product['secondary_image_local_path'] = gallery[1]
    product['gallery_normalized'] = 'vevor-550w-mattress-vacuum-four-image-gallery'
    product['main_image_search_engine'] = 'target-and-vevor-product-gallery'
    product['main_image_match_score'] = 100
    product['main_image_source_url'] = source
    product['image_verification_note'] = 'Gallery replaced with white VEVOR 550W mattress vacuum imagery matching 18Kpa suction, dual dust bins, HEPA filter, heating, ultrasound technology, and cleaning-light features; official VEVOR page was identified but may be regionally blocked, so verify current model and image-use permissions before Merchant Center publication.'
    updated += 1
    break
if updated != 1:
    raise SystemExit(f'expected_one_product_256_update_got_{updated}')
new_text = text[:match.start(1)] + json.dumps(products, separators=(',', ':'), ensure_ascii=False) + text[match.end(1):]
path.write_text(new_text, encoding='utf-8')
print('updated_product_id=256')
print('gallery_count=4')
