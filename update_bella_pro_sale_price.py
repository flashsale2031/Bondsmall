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
    if product.get('retail price') != 59.99:
        raise SystemExit(f'unexpected_retail_price={product.get("retail price")}')
    expected_gallery = [
        'assets/manufacturer-images/246-bella-pro-air-fryer-1.webp',
        'assets/manufacturer-images/246-bella-pro-air-fryer-2.webp',
        'assets/manufacturer-images/246-bella-pro-air-fryer-3.webp',
        'assets/manufacturer-images/246-bella-pro-air-fryer-4.webp',
    ]
    if product.get('images') != expected_gallery:
        raise SystemExit('bella_pro_gallery_does_not_match_verified_gallery')
    product['sale price'] = 49.99
    product['price_update_note'] = 'Sale price updated to $49.99 at merchant request; retail price remains $59.99 and the verified four-image gallery is unchanged.'
    updated += 1
    break
if updated != 1:
    raise SystemExit(f'expected_one_product_246_update_got_{updated}')
new_text = text[:match.start(1)] + json.dumps(products, separators=(',', ':'), ensure_ascii=False) + text[match.end(1):]
path.write_text(new_text, encoding='utf-8')
print('updated_product_id=246')
print('retail_price=59.99')
print('sale_price=49.99')
