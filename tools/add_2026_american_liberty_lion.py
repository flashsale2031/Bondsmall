from pathlib import Path
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
UPLOAD = Path('/home/ubuntu/upload')
ASSET_DIR = ROOT / 'assets' / 'american-liberty-lion-gold-2026'
ASSET_DIR.mkdir(parents=True, exist_ok=True)

source_names = [
    'obverse_full_field_lion_high_relief.png',
    'coin_60_degrees_right.png',
    'coin_60_degrees_left.png',
    'reverse_high_relief_small_mintmarks.png',
]
for name in source_names:
    source = UPLOAD / name
    if not source.exists():
        raise FileNotFoundError(source)
    shutil.copy2(source, ASSET_DIR / name)

relative_images = [f'assets/american-liberty-lion-gold-2026/{name}' for name in source_names]
product = {
    'id': 102,
    'name': 'United States 2026 American Liberty Lion 1 OZ Gold $1,000 Coin',
    'category': 'artandcollectibles',
    'retail price': 1000.00,
    'sale price': 1000.00,
    'image': relative_images[0],
    'description': (
        'A new addition to the United States Mint American Liberty gold coin collection, '
        'the 2026 American Liberty Lion Gold $1,000 Coin presents a dramatic high-relief lion '
        'design with a finely detailed reverse inspired by American founding ideals. Struck in '
        'a high-grade concentration of .9999 fine gold, the coin contains one troy ounce of fine '
        'gold and is presented as a distinguished collectible for serious numismatists and precious-metal collectors.'
    ),
    'images': relative_images,
    'specifications': {
        'brand': 'American Liberty',
        'material': '24K Gold',
        'weight': '1.000 troy oz fine gold',
        'purity': '.9999 Fine Gold',
        'face_value': '$1,000',
        'year': '2026',
        'mint_mark': 'W',
        'finish': 'High-relief collector design',
        'country_of_mint': 'United States',
        'product_type': 'Gold Coin',
    },
    'productType': 'Coin',
    'inventory': 1,
    'age_group': 'Adult',
    'gender': 'Unisex',
}

products_path = ROOT / 'products.js'
text = products_path.read_text()
if '"id": 102' not in text:
    insertion = json.dumps(product, indent=2, ensure_ascii=False)
    marker = '\n];\n'
    if marker not in text:
        raise RuntimeError('products.js closing marker not found')
    text = text.replace(marker, ',\n' + insertion + marker, 1)
    products_path.write_text(text)

index_path = ROOT / 'catalog-category-index.js'
index_text = index_path.read_text()
index_text, replacements = re.subn(
    r'("artandcollectibles"\s*:\s*\{\s*"count"\s*:\s*)4871',
    r'\g<1>4872',
    index_text,
    count=1,
)
if replacements != 1:
    raise RuntimeError(f'Expected one Art & Collectibles count replacement, got {replacements}')
index_path.write_text(index_text)

loader_path = ROOT / 'catalog-loader.js'
loader_text = loader_path.read_text()
old = """    while (state.records.length < end && state.scanned < chunkList.length) {\n      const chunkIndex = chunkList[state.scanned++];\n      const chunkRecords = await fetchPage(chunkIndex);\n      state.records.push(...chunkRecords.filter(product => normalizeCategory(product.category) === key));\n    }\n    const start = (pageNumber - 1) * perPage;\n"""
new = """    while (state.records.length < end && state.scanned < chunkList.length) {\n      const chunkIndex = chunkList[state.scanned++];\n      const chunkRecords = await fetchPage(chunkIndex);\n      state.records.push(...chunkRecords.filter(product => normalizeCategory(product.category) === key));\n    }\n    // Include newly added authoritative records that are not yet present in the\n    // generated lazy chunks, while avoiding duplicate IDs already in the chunk data.\n    if (state.scanned >= chunkList.length && authority.records.length) {\n      const knownIds = new Set(state.records.map(product => Number(product && product.id)));\n      for (const product of authority.records) {\n        if (normalizeCategory(product.category) === key && !knownIds.has(Number(product.id))) {\n          state.records.push(product);\n          knownIds.add(Number(product.id));\n        }\n      }\n    }\n    const start = (pageNumber - 1) * perPage;\n"""
if old not in loader_text:
    raise RuntimeError('catalog-loader category block not found')
loader_path.write_text(loader_text.replace(old, new, 1))

print('Added product 102 and copied images in order:', relative_images)
print('Updated Art & Collectibles count to 4872 and category loader fallback.')
print('Product JSON:', json.dumps(product, indent=2, ensure_ascii=False))
print('Changed files: products.js, catalog-category-index.js, catalog-loader.js, assets/american-liberty-lion-gold-2026/*')
