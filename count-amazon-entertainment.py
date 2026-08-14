from pathlib import Path
import pandas as pd, re
root=Path('/home/ubuntu/work_bondsmall/amazon_products')
terms=('toys & games','games & accessories','video games','music','movies','tv','collectible','hobbies','musical instrument','arts & crafts','party supplies','sports & outdoors')
total=usable=0; asins=set(); examples=[]
for p in sorted(root.glob('*.parquet')):
    df=pd.read_parquet(p)
    for _,r in df.iterrows():
        cat=str(r.get('Category') or '').lower(); title=str(r.get('Product Name') or '').strip(); img=str(r.get('Image') or '').strip(); spec=str(r.get('Product Specification') or '')
        if not any(t in cat for t in terms): continue
        total+=1
        m=re.search(r'ASIN:([A-Z0-9]{10})',spec)
        asin=m.group(1) if m else ''
        if title and img.startswith('http') and asin and asin not in asins:
            asins.add(asin); usable+=1
            if len(examples)<15: examples.append((p.name,asin,cat,title[:100],img[:90]))
print('eligible',total,'usable_unique_asin',usable,'all_rows',sum(len(pd.read_parquet(p)) for p in root.glob('*.parquet')))
for x in examples: print(x)
