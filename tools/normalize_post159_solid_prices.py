from pathlib import Path
import json,re
from decimal import Decimal
ROOT=Path(__file__).resolve().parents[1]
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
position=0; changed_fields=0; changed_records=0; by_field={'retail price':0,'sale price':0}; examples=[]; touched=[]
for path in sorted((ROOT/'catalog-pages').glob('products-page-*.js')):
    m=pat.search(path.read_text(encoding='utf-8'))
    if not m: raise SystemExit(f'wrapper error: {path}')
    products=json.loads('['+m.group(1)+']'); chunk_changed=False
    for p in products:
        record_changed=False
        if position>=159:
            for field in ('retail price','sale price'):
                value=p.get(field)
                if isinstance(value,(int,float)) and float(value).is_integer() and float(value)>=1:
                    old=value; new=float(Decimal(str(value))-Decimal('0.01'))
                    p[field]=round(new,2); changed_fields+=1; by_field[field]+=1; record_changed=True; chunk_changed=True
                    if len(examples)<20: examples.append({'position':position+1,'id':p.get('id'),'field':field,'old':old,'new':p[field]})
        if record_changed: changed_records+=1
        position+=1
    if chunk_changed:
        path.write_text('// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(...'+json.dumps(products,separators=(',',':'),ensure_ascii=False)+']);\n',encoding='utf-8')
        touched.append(path.name)
report={'total_records':position,'start_position':160,'changed_fields':changed_fields,'changed_records':changed_records,'by_field':by_field,'touched_chunks':len(touched),'examples':examples}
(ROOT/'post159-price-normalization-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
