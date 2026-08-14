from __future__ import annotations
import html,json,re,subprocess
from pathlib import Path
from urllib.parse import quote
import ijson
ROOT=Path(__file__).resolve().parent; PRODUCTS=ROOT/'products.js'; DOMAIN='https://www.bondsmall.com'
MAP={'men':'Apparel & Accessories > Clothing','women':'Apparel & Accessories > Clothing','accessories':'Apparel & Accessories > Clothing Accessories','artandcollectibles':'Arts & Entertainment > Hobbies & Creative Arts > Collectibles','electronics':'Electronics','entertainment':'Arts & Entertainment','homeandappliances':'Home & Garden','jewelry':'Apparel & Accessories > Jewelry'}
def text(v,f=''): return str(v or f).strip()
def pid(p,i): return re.sub(r'[^A-Za-z0-9._-]','-',text(p.get('sku')) or f'BM-{int(p.get("id",i)):04d}')[:50]
def imgs(p):
 v=p.get('images') or p.get('image') or []
 if isinstance(v,str): v=[v]
 out=[]
 for x in v:
  u=text(x); u='https:'+u if u.startswith('//') else u
  if u.startswith(('http://','https://')) and u not in out: out.append(u)
 return out
def xml(v): return html.escape(text(v),quote=False)
def price(p): return float(p.get('retail price') or p.get('price') or 0)
def brand(p): return text((p.get('specifications') or {}).get('brand'),'Unbranded')
class JsArrayReader:
 def __init__(self,f): self.f=f; self.buf=b''; self.done=False
 def read(self,n=-1):
  if self.done: return b''
  while True:
   data=self.f.read(n)
   if data: self.buf+=data
   j=self.buf.find(b'];')
   if j>=0:
    out=self.buf[:j+1]; self.buf=b''; self.done=True; return out
   if not data:
    out=self.buf; self.buf=b''; self.done=True; return out
   if len(self.buf)>1:
    out=self.buf[:-1]; self.buf=self.buf[-1:]; return out

def main():
 feed=ROOT/'google-shopping-feed.xml'; sm=ROOT/'sitemap.xml'; report={'catalog_products':0,'feed_products':0,'products_without_images':[],'products_pending_price_or_store_url':[],'products_without_brand':[],'products_without_gtin_or_mpn':[],'note':'Do not claim authenticity, ownership, availability, shipping cost, or product identifiers unless verified by the merchant.'}
 urls=[DOMAIN+'/',DOMAIN+'/shipping-policy.html',DOMAIN+'/return-policy.html',DOMAIN+'/contact.html',DOMAIN+'/privacy-policy.html',DOMAIN+'/terms.html']
 items=[]
 proc=subprocess.Popen(['bash','-lc',f'tail -c +{len(b"var products = ")+1} "{PRODUCTS}" | head -c -2'],stdout=subprocess.PIPE)
 try:
  for i,p in enumerate(ijson.items(proc.stdout,'item',use_float=True),1):
   report['catalog_products']+=1; im=imgs(p); ident=pid(p,i)
   if not im: report['products_without_images'].append(ident)
   if p.get('price_pending') or p.get('merchant_ready') is False: report['products_pending_price_or_store_url'].append(ident)
   if brand(p)=='Unbranded': report['products_without_brand'].append(ident)
   if not (p.get('gtin') or p.get('mpn')): report['products_without_gtin_or_mpn'].append(ident)
   if im: report['feed_products']+=1
   if im and not p.get('price_pending') and p.get('merchant_ready') is not False:
    sale=p.get('sale price'); sale_tag=''
    try:
     sale=float(sale) if sale not in (None,'') else None
    except: sale=None
    tags=[f'<g:id>{xml(ident)}</g:id>',f'<g:title>{xml(text(p.get("name") or p.get("title"),"Bonds Mall product")[:150])}</g:title>',f'<g:description>{xml(re.sub(r"\\s+"," ",text(p.get("description"),text(p.get("name"),"Bonds Mall product")))[:5000])}</g:description>',f'<link>{xml(DOMAIN+"/product.html?id="+quote(ident))}</link>',f'<g:image_link>{xml(im[0])}</g:image_link>']+[f'<g:additional_image_link>{xml(u)}</g:additional_image_link>' for u in im[1:10]]+[f'<g:availability>{"out of stock" if p.get("inventory") is not None and float(p.get("inventory") or 0)<=0 else "in stock"}</g:availability>',f'<g:condition>{text(p.get("condition"),"new").lower()}</g:condition>',f'<g:price>{price(p):.2f} USD</g:price>']
    if sale is not None and sale>0 and sale<price(p): tags.append(f'<g:sale_price>{sale:.2f} USD</g:sale_price>')
    tags += [f'<g:brand>{xml(brand(p))}</g:brand>',f'<g:product_type>{xml(text(p.get("productType") or p.get("category"),"General"))}</g:product_type>',f'<g:google_product_category>{xml(MAP.get(text(p.get("category")).lower(),"Shopping > General"))}</g:google_product_category>','<g:identifier_exists>no</g:identifier_exists>']
    if p.get('gender'): tags.append(f'<g:gender>{xml(p["gender"]).lower()}</g:gender>')
    if p.get('age_group'): tags.append(f'<g:age_group>{xml(p["age_group"]).lower()}</g:age_group>')
    items.append('    <item>\n      '+'\n      '.join(tags)+'\n    </item>'); urls.append(DOMAIN+'/product.html?id='+quote(ident))
 finally:
  proc.stdout.close(); proc.wait()
 feed.write_text('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>Bonds Mall product feed</title>\n    <link>'+DOMAIN+'/</link>\n    <description>Product data for Bonds Mall</description>\n'+'\n'.join(items)+'\n  </channel>\n</rss>\n')
 sm.write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+'\n'.join('  <url><loc>'+html.escape(u)+'</loc></url>' for u in urls)+'\n</urlset>\n')
 (ROOT/'merchant-feed-validation.json').write_text(json.dumps(report,indent=2)+'\n')
 print('catalog',report['catalog_products'],'feed',len(items),'without_images',len(report['products_without_images']))
if __name__=='__main__': main()
