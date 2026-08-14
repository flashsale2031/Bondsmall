import json, re, html
from pathlib import Path
p=Path('/home/ubuntu/work_bondsmall/shopify-20000-products.json')

def clean(v):
    v=html.unescape(v or '')
    v=re.sub(r'<[^>]+>',' ',v)
    return re.sub(r'\s+',' ',v).strip()

def category(row):
    tax=(row.get('ground_truth_category') or '').lower()
    title=(row.get('product_title') or '').lower()
    text=tax+' '+title
    if any(x in text for x in ['game console','video game','board game','movie','television','music album','dvd','blu-ray','entertainment']): return 'entertainment'
    if tax.startswith('toys & games') or tax.startswith('arts & entertainment'): return 'entertainment'
    return ''
rows=json.loads(p.read_text())
count=0; usable=0; examples=[]
for i,row in enumerate(rows):
    if category(row)=='entertainment':
        count+=1
        img=(row.get('product_image') or {}).get('src','') if isinstance(row.get('product_image'),dict) else ''
        if clean(row.get('product_title')) and img:
            usable+=1
            if len(examples)<20: examples.append((i,row.get('ground_truth_category'),row.get('product_title'),img[:100]))
print('total_rows',len(rows),'entertainment',count,'usable_title_image',usable)
for e in examples: print(e)
