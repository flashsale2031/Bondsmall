from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
AUDIT=json.loads((ROOT/'mens-womens-category-audit.json').read_text())
by_chunk={}
for x in AUDIT['flagged']:
    by_chunk.setdefault(x['chunk'],set()).add(x['id'])
changes=[]
for chunk,ids in by_chunk.items():
    path=ROOT/'catalog-pages'/chunk
    text=path.read_text(errors='ignore'); marker='window.products.push(...['; start=text.find(marker)
    payload=text[start+len(marker)-1:]; end=payload.rfind(']);')
    data=json.loads(payload[:end+1]); changed=False
    for p in data:
        if p.get('id') in ids and p.get('category')=='men':
            changes.append({'id':p.get('id'),'name':p.get('name'),'from':'men','to':'women','chunk':chunk})
            p['category']='women'; changed=True
    if changed:
        path.write_text(text[:start+len(marker)-1]+json.dumps(data,ensure_ascii=False,separators=(',',':'))+payload[end+1:])
report={'changed_count':len(changes),'changes':changes}
(ROOT/'mens-womens-category-corrections.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'changed_count':len(changes),'chunks':len(by_chunk),'sample':changes[:20]},ensure_ascii=False,indent=2))
