import requests,re,json,urllib.parse
from bs4 import BeautifulSoup
urls=['https://myhypergear.com/products/flip-2-in-1-wireless-headphones-speaker-black','https://www.logitech.com/en-us/products/webcams/c920e-business-webcam.html']
for url in urls:
 r=requests.get(url,headers={'User-Agent':'Mozilla/5.0'},timeout=30); soup=BeautifulSoup(r.text,'html.parser'); out=[]
 for a in soup.find_all('a'):
  href=a.get('href',''); txt=a.get_text(' ',strip=True).lower()
  if re.search(r'\.(?:jpg|jpeg|png|webp)(?:\?|$)',href,re.I) and not any(x in href.lower() for x in ['logo','icon','sprite','nav','og-image','pixel','tracking']): out.append(urllib.parse.urljoin(url,href))
 for img in soup.find_all('img'):
  for k in ('src','data-src','data-original','srcset'):
   v=img.get(k,'')
   for x in re.split(r'\s*,\s*|\s+',v):
    x=x.split(' ')[0]
    if re.search(r'\.(?:jpg|jpeg|png|webp)(?:\?|$)',x,re.I) and not any(y in x.lower() for y in ['logo','icon','sprite','nav','og-image','pixel','tracking']): out.append(urllib.parse.urljoin(url,x))
 uniq=[]
 for x in out:
  if x not in uniq: uniq.append(x)
 print(json.dumps({'url':url,'status':r.status_code,'gallery':uniq[:30]}))
