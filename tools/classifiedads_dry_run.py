from pathlib import Path
import json
import re
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
chunk = ROOT / 'catalog-pages' / 'products-page-00001.js'
source = chunk.read_text(encoding='utf-8')
start = source.index('window.products.push(...[')
end = source.rfind(']);')
products = json.loads(source[source.index('[', start):end + 1])
selected = products[:10]
assert len(selected) == 10, 'Catalog page did not provide ten products'

payload_products = []
for product in selected:
    images = product.get('images') or ([product.get('image')] if product.get('image') else [])
    item = {
        'id': product.get('id'),
        'sku': product.get('sku'),
        'name': product.get('name') or product.get('title') or '',
        'description': product.get('description') or '',
        'category': product.get('category') or '',
        'retail_price': product.get('retail price', product.get('retail_price')),
        'sale_price': product.get('sale price', product.get('sale_price')),
        'image': images[0] if images else '',
        'images': images,
        'source_url': product.get('source_url') or product.get('sourceUrl') or '',
    }
    assert item['name'], 'Missing product title'
    assert item['description'], f"Missing description for {item['name']}"
    assert item['images'], f"Missing images for {item['name']}"
    assert item['sale_price'] is not None or item['retail_price'] is not None, f"Missing price for {item['name']}"
    payload_products.append(item)

job = {
    'index': 0,
    'platform': 'classifiedads',
    'accountId': 'ca_dry_run',
    'accountLabel': 'ClassifiedAds dry-run account',
    'email': '',
    'productIndices': list(range(10)),
    'status': 'running',
    'handoff': {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'platform': 'classifiedads',
        'destination': 'https://www.classifiedads.com/',
        'account_label': 'ClassifiedAds dry-run account',
        'location': {'city': '', 'state': '', 'zip': ''},
        'products': payload_products,
        'instructions': 'DRY RUN ONLY — no listing submission performed.',
    },
}

report = {
    'mode': 'dry-run',
    'platform': 'classifiedads',
    'products_selected': len(payload_products),
    'queue_jobs': 1,
    'listing_payloads': len(payload_products),
    'destination': job['handoff']['destination'],
    'account_required': True,
    'account_connected': False,
    'published': False,
    'effective_checks': {
        'exactly_ten_products': len(payload_products) == 10,
        'all_titles_present': all(p['name'] for p in payload_products),
        'all_descriptions_present': all(p['description'] for p in payload_products),
        'all_images_present': all(p['images'] for p in payload_products),
        'all_prices_present': all(p['sale_price'] is not None or p['retail_price'] is not None for p in payload_products),
        'classifiedads_destination_present': job['handoff']['destination'].startswith('https://www.classifiedads.com'),
        'publishing_blocked': True,
    },
    'products': [{'id': p['id'], 'name': p['name'], 'sale_price': p['sale_price'], 'image_count': len(p['images'])} for p in payload_products],
    'blocker': 'No saved/connected ClassifiedAds account was present in the current browser profile; this dry run intentionally did not open or submit the external posting form.',
}

out = ROOT / 'tools' / 'classifiedads_dry_run_report.json'
out.write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
