from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
CHUNKS = ROOT / 'catalog-pages'
OUT = ROOT / 'mens-womens-category-audit.json'
WOMENS = re.compile(r"\b(women(?:'s|s)?|womens|ladies|lady|girls?|girl's|female|misses|maternity|bride|bridal|gown|dress|skirt|blouse|bra|panties|lingerie|handbag|purse|clutch|women's shoe|women's sneaker|women's boot|women's sandal|heels?)\b", re.I)
MENS = re.compile(r"\b(men(?:'s|s)?|mens|gentlemen|gentleman's|male|boys?|boy's|suit jacket|men's shoe|men's sneaker|men's boot|men's sandal|boxers?|briefs?)\b", re.I)
SHARED = re.compile(r"\b(unisex|men and women|for all|kids?|children|baby|toddler)\b", re.I)

def parse_chunk(path):
    text = path.read_text(errors='ignore'); marker='window.products.push(...['; start=text.find(marker)
    if start<0:return []
    payload=text[start+len(marker)-1:]; end=payload.rfind(']);')
    if end<0:return []
    try:return json.loads(payload[:end+1])
    except Exception:return []

counts={}; flags=[]
for path in sorted(CHUNKS.glob('products-page-*.js')):
    for p in parse_chunk(path):
        cat=str(p.get('category','')).lower(); counts[cat]=counts.get(cat,0)+1
        name=str(p.get('name',''))
        w=bool(WOMENS.search(name)); m=bool(MENS.search(name)); s=bool(SHARED.search(name))
        if cat=='men' and w and not m and not s:
            flags.append({'id':p.get('id'),'name':name,'category':p.get('category'),'chunk':path.name,'women_signal':w,'men_signal':m,'shared_signal':s})
OUT.write_text(json.dumps({'counts':counts,'flagged_count':len(flags),'flagged':flags},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'counts':counts,'flagged_count':len(flags),'sample':flags[:40]},ensure_ascii=False,indent=2))
