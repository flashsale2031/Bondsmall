import requests,re,json,urllib.parse,base64
from bs4 import BeautifulSoup
from pathlib import Path
root=Path(__file__).resolve().parents[1]
queries=['Logitech C920e Full HD 1080p Business Webcam','HyperGear Flip 2-in-1 Bluetooth Folding Over-Ear Headphones','HP Smart Tank 7603 Wireless All-in-One Printer','Canon SELPHY CP1500 Wireless Photo Printer','Fujifilm instax SQUARE Link Smartphone Printer','Breville Smart Oven Air Fryer']
known=['logitech.com','hypergear.com','hp.com','canon.com','fujifilm.com','breville.com']
rows=[]
for q in queries:
 u='https://www.bing.com/search?q='+urllib.parse.quote(q+' official manufacturer product page')
 r=requests.get(u,headers={'User-Agent':'Mozilla/5.0'},timeout=30); soup=BeautifulSoup(r.text,'html.parser'); hits=[]
 for li in soup.select('li.b_algo'):
  a=li.select_one('h2 a')
  if not a: continue
  href=a.get('href',''); title=a.get_text(' ',strip=True)
  um=re.search(r'[?&]u=a1([^&]+)',href)
  if um:
   try: href=base64.b64decode(um.group(1)+'===').decode('utf-8','ignore')
   except Exception: pass
  domain=re.sub(r'^www\.','',urllib.parse.urlparse(href).netloc.lower())
  hits.append({'title':title,'url':href,'domain':domain,'official_score':int(any(x==domain or domain.endswith('.'+x) for x in known))})
 rows.append({'query':q,'status':r.status_code,'hits':hits[:10]})
(root/'bing-manufacturer-sample.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps(rows,indent=2,ensure_ascii=False))
