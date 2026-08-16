from pathlib import Path
import json,re,math
ROOT=Path(__file__).resolve().parents[1]
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
position=0; total=0; eligible=0; failing=[]; missing=[]; ending_fail=[]
for path in sorted((ROOT/'catalog-pages').glob('products-page-*.js')):
    m=pat.search(path.read_text(encoding='utf-8'))
    if not m: raise SystemExit(f'wrapper error: {path}')
    products=json.loads('['+m.group(1)+']')
    for p in products:
        total+=1
        if position>=159:
            retail=p.get('retail price'); sale=p.get('sale price'); eligible+=1
            if not isinstance(retail,(int,float)) or not isinstance(sale,(int,float)) or retail<=0:
                missing.append({'position':position+1,'id':p.get('id'),'retail':retail,'sale':sale}); position+=1; continue
            if round(float(sale)*100)%100 != 99: ending_fail.append({'position':position+1,'id':p.get('id'),'field':'sale price','value':sale})
            if float(sale) > float(retail)*0.85 + 1e-9:
                failing.append({'position':position+1,'id':p.get('id'),'retail':retail,'sale':sale,'discount_pct':round((1-float(sale)/float(retail))*100,4),'name':p.get('name','')})
        position+=1
print(json.dumps({'total_records':total,'post159_records':eligible,'failing_discount_records':len(failing),'missing_or_invalid':len(missing),'sale_ending_failures':len(ending_fail),'examples':failing[:20],'missing_examples':missing[:10]},indent=2))
