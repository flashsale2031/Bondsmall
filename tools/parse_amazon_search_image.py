import json,re,requests
from bs4 import BeautifulSoup
asin='B08JPFJ4RV'
for url in [f'https://www.amazon.com/s?k={asin}', f'https://www.google.com/search?tbm=isch&q={asin}']:
 r=requests.get(url,headers={'User-Agent':'Mozilla/5.0'},timeout=30)
 print('URL',url,'status',r.status_code,'bytes',len(r.content))
 soup=BeautifulSoup(r.text,'html.parser')
 vals=[]
 for tag in soup.find_all(attrs={'data-a-dynamic-image':True}):
  try: vals.extend(json.loads(tag['data-a-dynamic-image']).keys())
  except: pass
 for tag in soup.find_all('img'):
  for attr in ['src','data-src']:
   if tag.get(attr) and ('amazon' in tag.get(attr) or 'gstatic' in tag.get(attr)):
    vals.append(tag.get(attr))
 print('\n'.join(dict.fromkeys(vals))[:3000])
 print('asin_mentions',r.text.lower().count(asin.lower()))
