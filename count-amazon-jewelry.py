from pathlib import Path
import pandas as pd,re
root=Path('/home/ubuntu/work_bondsmall/amazon_products')
terms=('jewelry','jewellery','rings','necklaces','earrings','bracelets','watches','brooches','charms','pendants','body jewelry','fine art')
rows=usable=0; keys=set(); asins=set()
for p in sorted(root.glob('*.parquet')):
 df=pd.read_parquet(p)
 for _,r in df.iterrows():
  cat=str(r.get('Category') or '').lower(); title=str(r.get('Product Name') or '').strip(); img=str(r.get('Image') or '').strip(); spec=str(r.get('Product Specification') or '')
  if not any(t in cat for t in terms): continue
  rows+=1; m=re.search(r'ASIN:([A-Z0-9]{10})',spec); asin=m.group(1) if m else ''
  if title and img.startswith('http') and asin:
   keys.add((asin,title,img)); asins.add(asin); usable+=1
print('eligible_rows',rows,'usable_rows',usable,'distinct_listing_keys',len(keys),'distinct_asins',len(asins))
