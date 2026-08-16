import json,re,collections
from pathlib import Path
root=Path(__file__).resolve().parents[1]; pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S); brands=collections.Counter(); domains=collections.Counter(); samples={}
KNOWN=['Logitech','Marshall','HyperGear','Supersonic','Delton','Macally','PRIMEPLUS','J Tech Digital','Fujifilm','HP','Canon','Breville','Samsung','Amazon','Apple','Google','Mejuri','Swarovski','Madewell','Baggallini','Bose','Sony','Nintendo','Microsoft','KitchenAid','Ninja','Dyson','Shark','Anker','JBL','TCL','Vizio','Roku','SYLVOX','BaubleBar','Gorjana','Missoma','ASOS']
for f in sorted((root/'catalog-pages').glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8')); recs=json.loads('['+m.group(1)+']') if m else []
 for p in recs:
  if int(p.get('id',0))<=180: continue
  n=str(p.get('name','')); u=str(p.get('source_url','')); low=n.lower(); found=next((b for b in KNOWN if b.lower() in low),None)
  if not found:
   dm=re.search(r'https?://(?:www\.)?([^/]+)',u); found=dm.group(1).lower() if dm else 'unknown'
  brands[found]+=1
  dm=re.search(r'https?://(?:www\.)?([^/]+)',u); domains[dm.group(1).lower() if dm else 'none']+=1
  if found not in samples and len(samples)<100: samples[found]={'id':p.get('id'),'name':n,'source_url':u}
out={'manufacturer_or_brand_candidates':brands.most_common(100),'source_domains':domains.most_common(100),'samples':samples}
(root/'post180-manufacturer-candidate-audit.json').write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps({'top_candidates':brands.most_common(30),'top_domains':domains.most_common(20)}))
