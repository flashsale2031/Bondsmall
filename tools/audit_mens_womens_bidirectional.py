from pathlib import Path
import json, re
ROOT=Path(__file__).resolve().parents[1]; CHUNKS=ROOT/'catalog-pages'; OUT=ROOT/'mens-womens-bidirectional-audit.json'
WOMEN=re.compile(r"\b(women(?:'s|s)?|womens|ladies|lady|female|misses|maternity|bride|bridal|gown|dress|skirts?|blouses?|bras?|panties|lingerie|handbags?|purses?|clutches?|heels?|women's (?:shoe|sneaker|boot|sandal)|bikini|tankini|camisole|shapewear|boyleg underwear|nursing|breastfeeding|wigs?|hair extensions?)\b",re.I)
MEN=re.compile(r"\b(men(?:'s|s)?|mens|gentlemen|gentleman's|male|boys?|boy's|men's (?:shoe|sneaker|boot|sandal)|boxers?|briefs?|jockstrap|beard|necktie|bow tie|cufflinks?|men's suit|men's blazer|men's polo)\b",re.I)
SHARED=re.compile(r"\b(unisex|men and women|for all|kids?|children|child|baby|toddler|youth|junior)\b",re.I)

def parse(path):
 t=path.read_text(errors='ignore'); m='window.products.push(...['; s=t.find(m)
 if s<0:return []
 payload=t[s+len(m)-1:]; e=payload.rfind(']);')
 try:return json.loads(payload[:e+1])
 except:return []
counts={}; flags=[]
for path in sorted(CHUNKS.glob('products-page-*.js')):
 for p in parse(path):
  c=str(p.get('category','')).lower(); counts[c]=counts.get(c,0)+1; n=str(p.get('name','')); w=bool(WOMEN.search(n)); m=bool(MEN.search(n)); sh=bool(SHARED.search(n))
  if sh: continue
  if c=='men' and w and not m: flags.append({'id':p.get('id'),'name':n,'from':'men','to':'women','chunk':path.name})
  elif c=='women' and m and not w: flags.append({'id':p.get('id'),'name':n,'from':'women','to':'men','chunk':path.name})
OUT.write_text(json.dumps({'counts':counts,'flagged_count':len(flags),'flagged':flags},ensure_ascii=False,indent=2)+'\n')
from collections import Counter
print(json.dumps({'counts':counts,'flagged_count':len(flags),'directions':{f'{a}->{b}':n for (a,b),n in Counter((x['from'],x['to']) for x in flags).items()},'sample':flags[:60]},ensure_ascii=False,indent=2,default=str))
