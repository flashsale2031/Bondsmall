import json,re,argparse
from pathlib import Path
root=Path(__file__).resolve().parents[1]
BRANDS=['Amazon','Apple','Google','Logitech','Marshall','Mejuri','Swarovski','Madewell','Baggallini','Breville','Bose','Samsung','Sony','Nintendo','Xbox','Microsoft','HyperGear','Supersonic','Delton','Macally','PRIMEPLUS','J Tech Digital','ZONESUN','SYLVOX','Bearfruit','Lia','The Lovery','Julianna B','Arte Nova','MLB','NHL','Dodgers','Keith Haring','Uncommon Goods','West Elm','Wayfair','Dyson','Ninja','Cuisinart','KitchenAid','Shark','Vizio','TCL','Roku','Anker','Belkin','JBL','HP','Dell','Lenovo','Acer','Asus','Nike','Adidas','Coach','Fossil','Kate Spade','Michael Kors','Calvin Klein','Levi\'s','Ray-Ban','Gucci','Prada','Versace','Pandora','Tiffany & Co.','Etsy','Art.com']
BRANDS=sorted(BRANDS,key=len,reverse=True)
PHRASES=['noise cancelling headphones','over-ear headphones','on-ear headphones','bluetooth headphones','wireless headphones','gaming headset','computer headset','wall sculpture','giclee print','art print','stained glass','coffee maker','espresso machine','air fryer','food processor','stand mixer','vacuum cleaner','robot vacuum','smart display','smart speaker','smart watch','fitness tracker','digital camera','action camera','webcam','tablet','laptop','desktop computer','mechanical keyboard','bluetooth keyboard','wireless keyboard','computer mouse','gaming mouse','phone case','crossbody bag','shoulder bag','tote bag','backpack','wristlet','sunglasses','reading glasses','birthstone bracelet','tennis bracelet','charm bracelet','bangle','bracelet','necklace','pendant','earrings','hoop earrings','stud earrings','ring','jewelry set','jewelry','dress','jacket','coat','sweater','hoodie','shirt','blouse','jeans','pants','shorts','skirt','shoes','sneakers','boots','sandals','handbag','candle','monopoly','board game','video game','toy','puzzle','home decor','throw pillow','blanket','duvet','lamp','mirror','vase','planter','storage cabinet','office chair','dining table','coffee table','bed frame','mattress','cookware set','bakeware','water bottle','travel mug','wallet','luggage','watch']
PHRASES=sorted(PHRASES,key=len,reverse=True)
STOP={'the','a','an','and','with','for','of','on','in','to','from','new','premium','full','hd','ultra','high','definition','built','including','compatible','design','designed','black','white','silver','gold','blue','pink','green','red','grey','gray','small','large','portable','folding','foldable','wireless','bluetooth','smart','natural','handmade','personalized','adjustable','classic','modern','set','piece','pieces','edition','anniversary','collection','style','type','model'}
def clean(s): return re.sub(r'\s+',' ',re.sub(r'[^A-Za-z0-9&+\'’-]',' ',s)).strip()
def brand_for(name,source=''):
 low=name.lower()
 for b in BRANDS:
  if re.search(r'(?<![A-Za-z])'+re.escape(b.lower())+r'(?![A-Za-z])',low): return b
 source_low=source.lower()
 if 'uncommongoods.com' in source_low: return 'Uncommon Goods'
 if 'art.com' in source_low: return 'Art.com'
 first=clean(name).split()
 if first and len(first[0])<=6 and (first[0].isupper() or any(c.isdigit() for c in first[0])): return first[0]
 return ''
def type_for(name,brand):
 low=name.lower()
 for phrase in PHRASES:
  if phrase in low: return phrase.title()
 words=clean(name).split(); filtered=[]
 for w in words:
  if brand and w.lower() in brand.lower().split(): continue
  if w.lower() in STOP or any(c.isdigit() for c in w): continue
  filtered.append(w)
 if not filtered: return 'Product'
 return ' '.join(filtered[-3:]).title()
def shorten(name,source=''):
 original=clean(name); b=brand_for(original,source); t=type_for(original,b); result=(b+' '+t).strip() if b else t
 if len(result)>48: result=' '.join(result.split()[:6])
 return result
def iter_chunks():
 for f in sorted((root/'catalog-pages').glob('products-page-*.js')):
  m=re.search(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',f.read_text(encoding='utf-8'),re.S)
  if m: yield f,json.loads('['+m.group(1)+']')
def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--apply',action='store_true'); ap.add_argument('--sample',type=int,default=100); args=ap.parse_args(); changed=0; after=0; samples=[]
 for f,recs in iter_chunks():
  dirty=False
  for p in recs:
   if int(p.get('id',0))<=180: continue
   after+=1; old=p.get('name',''); new=shorten(old,p.get('source_url',''))
   if len(samples)<args.sample: samples.append({'id':p.get('id'),'old':old,'new':new})
   if args.apply and new and new!=old:
    p.setdefault('original_name',old); p['name']=new; dirty=True; changed+=1
  if args.apply and dirty:
   payload=json.dumps(recs,ensure_ascii=False,separators=(',',':')); f.write_text(f'// Bondsmall page-sized catalog chunk\nwindow.products = window.products || [];\nwindow.products.push(...{payload});\n',encoding='utf-8')
 out={'records_after_180':after,'changed':changed,'sample':samples,'applied':args.apply}
 (root/'names-after-180-shortening-report.json').write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps({'records_after_180':after,'changed':changed,'applied':args.apply,'sample':samples[:20]}))
if __name__=='__main__': main()
