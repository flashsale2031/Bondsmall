from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import unquote
import re, json
p=Path('/home/ubuntu/browser_html/ralphlauren_com_342680-C.html_1786900535976.html')
soup=BeautifulSoup(p.read_text(errors='ignore'),'html.parser')
urls=[]
for tag in soup.find_all(['img','source']):
 for attr in ['src','data-src','srcset','data-srcset']:
  value=tag.get(attr)
  if not value: continue
  for item in str(value).split(','):
   u=item.strip().split(' ')[0]
   if u.startswith('//'): u='https:'+u
   if u.startswith('/'):
    u='https://www.ralphlauren.com'+u
   if u.startswith('http') and ('scene7' in u.lower() or 'rlmedia' in u.lower() or 'pologsi' in u.lower()):
    urls.append(unquote(u))
# Search embedded JSON/script strings too
text=p.read_text(errors='ignore')
for u in re.findall(r'https?://[^"\'<>\\ ]+', text):
 if any(x in u.lower() for x in ['scene7','rlmedia','pologsi']): urls.append(unquote(u))
seen=set(); gallery=[]
for u in urls:
 u=u.replace('\\u0026','&').replace('\\/','/')
 u=re.sub(r'([?&])(?:wid|hei|qlt)=\d+','\\1',u)
 if 'swatch_' in u.lower(): continue
 if any(x in u.lower() for x in ['logo','icon','flyout','brand']): continue
 if u not in seen: seen.add(u); gallery.append(u)
out={'name':'The Iconic Oxford Shirt - All Fits','brand':'Polo Ralph Lauren','category':'men','sourceUrl':'https://www.ralphlauren.com/men-clothing-button-down-shirts/the-iconic-oxford-shirt---all-fits/342680-C.html','officialProductId':'342680','assetSet':'s7-1151197','officialPrice':130.0,'officialSalePrice':89.99,'gallery':[u for u in gallery if '/is/image/' in u and not any(x in u.lower() for x in ['_zoom_','_mob$'])][:8]}
Path('/home/ubuntu/diagnose_Bondsmall/repo/mens-verified-candidates.json').write_text(json.dumps({'candidates':[out]},indent=2)+'\\n')
print(json.dumps({'count':len(out['gallery']),'candidate':out},indent=2))
