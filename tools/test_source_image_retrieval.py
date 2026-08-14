import requests
from bs4 import BeautifulSoup
urls=['https://www.amazon.com/dp/B08Z743RRD','https://www.amazon.com/dp/B097BQDGHJ','https://enroutejewelry.com/products/petra-multi-stone-drop-necklace-in-gold.js','https://baublebar.com/products/semi-precious-heart-necklace-light-jade-malachite-new.js']
for u in urls:
    try:
        r=requests.get(u,headers={'User-Agent':'Mozilla/5.0'},timeout=20,allow_redirects=True)
        print('URL',u,'status',r.status_code,'final',r.url,'type',r.headers.get('content-type'),'bytes',len(r.content))
        soup=BeautifulSoup(r.text,'html.parser')
        for key in [('property','og:image'),('name','twitter:image')]:
            tag=soup.find('meta',attrs={key[0]:key[1]})
            if tag: print(key,tag.get('content'))
        print(r.text[:120].replace('\n',' '))
    except Exception as e: print('ERR',u,repr(e))
