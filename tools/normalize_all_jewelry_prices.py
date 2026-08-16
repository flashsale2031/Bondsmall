from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
def lower99(cents): return ((cents-99)//100)*100+99
position=0; total_jewelry=0; changed=0; touched=[]; examples=[]
for path in sorted((ROOT/'catalog-pages').glob('products-page-*.js')):
    m=pat.search(path.read_text(encoding='utf-8'))
    if not m: raise SystemExit(f'wrapper error: {path}')
    products=json.loads('['+m.group(1)+']'); chunk_changed=False
    for p in products:
        cat=str(p.get('category','')).strip().lower()
        if cat in ('jewelry','jewellery'):
            total_jewelry+=1; r=p.get('retail price'); s=p.get('sale price')
            if isinstance(r,(int,float)) and isinstance(s,(int,float)) and r>0:
                rc=int(round(float(r)*100)); sc=int(round(float(s)*100)); limit=min(sc,(rc*85)//100); target_cents=lower99(limit)
                if target_cents<99: raise SystemExit(f'no feasible .99 price for jewelry id {p.get("id")}')
                target=target_cents/100
                if abs(float(s)-target)>1e-9:
                    if len(examples)<20: examples.append({'position':position+1,'id':p.get('id'),'retail':r,'old_sale':s,'new_sale':target})
                    p['sale price']=target; changed+=1; chunk_changed=True
        position+=1
    if chunk_changed:
        path.write_text('// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(...'+json.dumps(products,separators=(',',':'),ensure_ascii=False)+']);\n',encoding='utf-8'); touched.append(path.name)
report={'jewelry_records':total_jewelry,'changed_records':changed,'touched_chunks':len(touched),'examples':examples}
(ROOT/'jewelry-price-normalization-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
