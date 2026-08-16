from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]; CHUNKS=ROOT/'catalog-pages'
AUDIT=json.loads((ROOT/'mens-womens-bidirectional-audit.json').read_text())
EX_M=re.compile(r"\b(men(?:'s|s)?|mens|for men|male|gentlemen|gentleman's|boys?|boy's|men's (?:shoe|sneaker|boot|sandal|suit|blazer|polo)|jockstrap|necktie|bow tie|cufflinks?)\b",re.I)
EX_W=re.compile(r"\b(women(?:'s|s)?|womens|for women|ladies|lady|female|maternity|pregnant|breastfeeding|nursing|bikini|tankini|camisole|shapewear|lingerie|handbag|purse|clutch|heels?|wigs?|hair extensions?)\b",re.I)
by_chunk={}
for x in AUDIT['flagged']:
 n=x['name'];
 if (x['from'],x['to'])==('men','women') and EX_W.search(n): by_chunk.setdefault(x['chunk'],set()).add(x['id'])
 if (x['from'],x['to'])==('women','men') and EX_M.search(n): by_chunk.setdefault(x['chunk'],set()).add(x['id'])
changes=[]
for chunk,ids in by_chunk.items():
 path=ROOT/'catalog-pages'/chunk; text=path.read_text(errors='ignore'); marker='window.products.push(...['; start=text.find(marker); payload=text[start+len(marker)-1:]; end=payload.rfind(']);'); data=json.loads(payload[:end+1]); changed=False
 for p in data:
  if p.get('id') not in ids: continue
  old=p.get('category'); new='women' if old=='men' else 'men' if old=='women' else old
  if new!=old:
   p['category']=new; changes.append({'id':p.get('id'),'name':p.get('name'),'from':old,'to':new,'chunk':chunk}); changed=True
 if changed: path.write_text(text[:start+len(marker)-1]+json.dumps(data,ensure_ascii=False,separators=(',',':'))+payload[end+1:])
(ROOT/'mens-womens-bidirectional-corrections.json').write_text(json.dumps({'changed_count':len(changes),'changes':changes},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'changed_count':len(changes),'chunks':len(by_chunk),'directions':{d:sum(1 for x in changes if f"{x['from']}->{x['to']}"==d) for d in ['men->women','women->men']}},indent=2))
