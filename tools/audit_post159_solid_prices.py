from pathlib import Path
import json,re,collections
ROOT=Path(__file__).resolve().parents[1]
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
position=0; solid=collections.Counter(); examples=[]; affected_records=0; total_records=0
for path in sorted((ROOT/'catalog-pages').glob('products-page-*.js')):
    m=pat.search(path.read_text(encoding='utf-8'))
    if not m: raise SystemExit(f'wrapper error: {path}')
    products=json.loads('['+m.group(1)+']')
    for p in products:
        total_records+=1
        if position>=159:
            hit=False
            for field in ('retail price','sale price'):
                value=p.get(field)
                if isinstance(value,(int,float)) and float(value).is_integer():
                    solid[field]+=1; hit=True
                    if len(examples)<20: examples.append({'position':position+1,'id':p.get('id'),'field':field,'value':value,'name':p.get('name','')})
            if hit: affected_records+=1
        position+=1
print(json.dumps({'total_records':total_records,'post_159_records':max(0,total_records-159),'solid_price_fields':solid,'affected_records':affected_records,'examples':examples},indent=2))
