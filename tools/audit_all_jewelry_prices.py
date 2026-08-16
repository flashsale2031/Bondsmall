from pathlib import Path
import json,re,collections
ROOT=Path(__file__).resolve().parents[1]
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
position=0; jewelry=[]; solid=collections.Counter(); discount_fail=[]; ending_fail=[]
for path in sorted((ROOT/'catalog-pages').glob('products-page-*.js')):
    m=pat.search(path.read_text(encoding='utf-8'))
    if not m: raise SystemExit(f'wrapper error: {path}')
    for p in json.loads('['+m.group(1)+']'):
        if str(p.get('category','')).strip().lower() in ('jewelry','jewellery'):
            jewelry.append({'position':position+1,'id':p.get('id'),'name':p.get('name',''),'retail':p.get('retail price'),'sale':p.get('sale price')})
            for f in ('retail','sale'):
                v=jewelry[-1][f]
                if isinstance(v,(int,float)) and float(v).is_integer() and v>0: solid[f]+=1
            r=p.get('retail price'); s=p.get('sale price')
            if isinstance(r,(int,float)) and isinstance(s,(int,float)) and s>r*.85+1e-9: discount_fail.append(jewelry[-1])
            if isinstance(s,(int,float)) and round(s*100)%100!=99: ending_fail.append(jewelry[-1])
        position+=1
print(json.dumps({'jewelry_records':len(jewelry),'solid_fields':solid,'discount_failures':len(discount_fail),'sale_ending_failures':len(ending_fail),'solid_examples': [x for x in jewelry if any(isinstance(x[f],(int,float)) and float(x[f]).is_integer() for f in ('retail','sale'))][:20], 'discount_examples': discount_fail[:20], 'ending_examples': ending_fail[:20]},indent=2))
