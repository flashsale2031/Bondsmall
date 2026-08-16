from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
CHUNKS = ROOT / 'catalog-pages'
OUT = ROOT / 'jewelry-home-category-audit.json'

JEWELRY = re.compile(r'\b(jewelry|jewellery|necklace|pendant|earring|bracelet|bangle|wedding band|engagement ring|diamond ring|gemstone|brooch|tiara|cufflink|wristwatch|choker|lariat|anklet|stud earrings?|hoop earrings?)\b', re.I)
HOME = re.compile(r'\b(home appliance|appliance|furniture|sofa|couch|recliner|chair|table|desk|bed frame|bunk bed|mattress|bedding|sheet set|pillow|blanket|curtain|rug|carpet|lamp|lighting|vacuum|refrigerator|fridge|freezer|oven|range|stove|microwave|dishwasher|washer|dryer|blender|toaster|coffee maker|cookware|dutch oven|air fryer|humidifier|dehumidifier|air conditioner|heater|grill|patio furniture|garden hose|lawn mower|outdoor furniture)\b', re.I)

def parse_chunk(path):
    text = path.read_text(errors='ignore')
    marker = 'window.products.push(...['
    start = text.find(marker)
    if start < 0: return []
    payload = text[start + len(marker) - 1:]
    end = payload.rfind(']);')
    if end < 0: return []
    try: return json.loads(payload[:end + 1])
    except Exception: return []

counts = {}
flags = []
for path in sorted(CHUNKS.glob('products-page-*.js')):
    for p in parse_chunk(path):
        cat = str(p.get('category','')).lower()
        counts[cat] = counts.get(cat, 0) + 1
        name = str(p.get('name',''))
        j = bool(JEWELRY.search(name))
        h = bool(HOME.search(name))
        if (cat == 'jewelry' and h and not j) or (cat in {'homeandappliances','home & appliances','home_appliances'} and j and not h):
            flags.append({'id': p.get('id'), 'name': name, 'category': p.get('category'), 'chunk': path.name, 'jewelry_signal': j, 'home_signal': h})

report = {'counts': counts, 'flagged_count': len(flags), 'flagged': flags}
OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'counts': counts, 'flagged_count': len(flags), 'sample': flags[:30]}, ensure_ascii=False, indent=2))
