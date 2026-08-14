from pathlib import Path
import pandas as pd, re
root=Path('/home/ubuntu/work_bondsmall/amazon_products')
keys=set(); asins=set(); rows=0
for p in sorted(root.glob('*.parquet')):
    df=pd.read_parquet(p)
    for _,r in df.iterrows():
        cat=str(r.get('Category') or '').lower()
        if not any(t in cat for t in ('toys & games','games & accessories','video games','music','movies','tv','collectible','hobbies','musical instrument','arts & crafts','party supplies','sports & outdoors')): continue
        title=str(r.get('Product Name') or '').strip(); img=str(r.get('Image') or '').strip(); spec=str(r.get('Product Specification') or '')
        m=re.search(r'ASIN:([A-Z0-9]{10})',spec); asin=m.group(1) if m else ''
        if not(title and img.startswith('http') and asin): continue
        rows+=1; keys.add((asin,title,img)) ; asins.add(asin)
print('usable_rows',rows,'distinct_asin_title_image',len(keys),'distinct_asin',len(asins))
