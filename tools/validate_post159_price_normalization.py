from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
position=0; remaining=[]; pre159_solid=[]; total=0; decimal=0
for path in sorted((ROOT/'catalog-pages').glob('products-page-*.js')):
    m=pat.search(path.read_text(encoding='utf-8'))
    if not m: raise SystemExit(f'wrapper error: {path}')
    try:
        products=json.loads('['+m.group(1)+']')
    except Exception as exc:
        raise SystemExit(f'json error in {path}: {exc}')
    for p in products:
        total+=1
        for field in ('retail price','sale price'):
            value=p.get(field)
            if isinstance(value,(int,float)):
                if not float(value).is_integer(): decimal+=1
                elif float(value)>0:
                    entry={'position':position+1,'id':p.get('id'),'field':field,'value':value}
                    (pre159_solid if position<159 else remaining).append(entry)
        position+=1
if remaining: raise SystemExit(json.dumps({'remaining_post159_solid':remaining[:20],'count':len(remaining)},indent=2))
report={'total_records':total,'post159_solid_remaining':0,'pre159_positive_solid_prices':len(pre159_solid),'decimal_price_fields':decimal,'sample_pre159':pre159_solid[:10]}
print(json.dumps(report,indent=2))
