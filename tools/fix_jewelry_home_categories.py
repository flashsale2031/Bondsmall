from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
CHUNKS = ROOT / 'catalog-pages'
REPORT = ROOT / 'jewelry-home-category-corrections.json'

HOME = re.compile(r'\b(home appliance|appliance|furniture|sofa|couch|recliner|chair|table|desk|bed frame|bunk bed|mattress|bedding|sheet set|pillow|blanket|curtain|rug|carpet|lamp|lighting|vacuum|refrigerator|fridge|freezer|oven|range|stove|microwave|dishwasher|washer|dryer|blender|toaster|coffee maker|cookware|dutch oven|air fryer|humidifier|dehumidifier|air conditioner|heater|grill|patio furniture|garden hose|lawn mower|outdoor furniture)\b', re.I)
WEARABLE = re.compile(r'\b(necklace|earrings?|bracelet|bangle|choker|lariat|anklet|tiara|brooch|cufflinks?|wedding band|engagement ring|diamond ring|gemstone ring|sterling silver ring|jewelry (?:women|men)|jewellery (?:women|men))\b', re.I)
NON_JEWELRY = re.compile(r'\b(supply|supplies|craft|making|repair|pouch|bag|organizer|organiser|display|storage|box|frame|stand|holder|ornament|decor|decoration|beads?|thread|jump rings?|earring posts?|earring backs?|sash|safety|armband|fan|humidifier|music box|crystal tree|gemstone vase|vase filler|thali|mold|mould|espresso|coffee|machine|filter|napkin|bottle|jar|art|figurine|statue|crystal|water|air)\b', re.I)

def parse_chunk(path):
    text = path.read_text(errors='ignore')
    marker = 'window.products.push(...['
    start = text.find(marker)
    if start < 0: return None, None, None
    payload = text[start + len(marker) - 1:]
    end = payload.rfind(']);')
    if end < 0: return None, None, None
    try: data = json.loads(payload[:end + 1])
    except Exception: return None, None, None
    return text[:start + len(marker) - 1], data, payload[end + 1:]

def target_category(p):
    name = str(p.get('name',''))
    cat = str(p.get('category','')).lower()
    if cat == 'jewelry' and HOME.search(name) and not WEARABLE.search(name):
        return 'homeandappliances'
    if cat == 'homeandappliances' and WEARABLE.search(name) and not NON_JEWELRY.search(name):
        return 'jewelry'
    return None

changes=[]
for path in sorted(CHUNKS.glob('products-page-*.js')):
    prefix, data, suffix = parse_chunk(path)
    if data is None: continue
    changed=False
    for p in data:
        new=target_category(p)
        if new and new != p.get('category'):
            changes.append({'id':p.get('id'),'name':p.get('name'),'from':p.get('category'),'to':new,'chunk':path.name})
            p['category']=new
            changed=True
    if changed:
        path.write_text(prefix + json.dumps(data, ensure_ascii=False, separators=(',',':')) + suffix)

REPORT.write_text(json.dumps({'changed_count':len(changes),'changes':changes}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'changed_count':len(changes),'by_direction':{k:sum(1 for x in changes if x['from']==k) for k in ['jewelry','homeandappliances']} ,'sample':changes[:30]}, ensure_ascii=False, indent=2))
