from pathlib import Path
import json,re,math
ROOT=Path(__file__).resolve().parents[1]
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
position=0; total=0; changed=0; touched=[]; examples=[]; infeasible=[]
def lower_99_cents(cents):
    return ((cents-99)//100)*100+99
for path in sorted((ROOT/'catalog-pages').glob('products-page-*.js')):
    m=pat.search(path.read_text(encoding='utf-8'))
    if not m: raise SystemExit(f'wrapper error: {path}')
    products=json.loads('['+m.group(1)+']'); chunk_changed=False
    for p in products:
        total+=1
        if position>=159:
            retail=p.get('retail price'); sale=p.get('sale price')
            if not isinstance(retail,(int,float)) or not isinstance(sale,(int,float)) or retail<=0: position+=1; continue
            retail_cents=int(round(float(retail)*100)); sale_cents=int(round(float(sale)*100))
            threshold_cents=(retail_cents*85)//100
            limit=min(sale_cents,threshold_cents)
            target_cents=lower_99_cents(limit)
            if target_cents<99:
                infeasible.append({'position':position+1,'id':p.get('id'),'retail':retail,'sale':sale,'threshold_cents':threshold_cents}); position+=1; continue
            target=target_cents/100
            if abs(float(sale)-target)>1e-9:
                old=sale; p['sale price']=target; changed+=1; chunk_changed=True
                if len(examples)<20: examples.append({'position':position+1,'id':p.get('id'),'retail':retail,'old_sale':old,'new_sale':target,'discount_pct':round((1-target/float(retail))*100,4)})
        position+=1
    if chunk_changed:
        path.write_text('// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(...'+json.dumps(products,separators=(',',':'),ensure_ascii=False)+']);\n',encoding='utf-8')
        touched.append(path.name)
report={'total_records':total,'post159_start':160,'changed_records':changed,'touched_chunks':len(touched),'infeasible_records':len(infeasible),'examples':examples}
(ROOT/'post159-discount-normalization-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
