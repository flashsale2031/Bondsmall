import requests,re,json,hashlib
from pathlib import Path
from PIL import Image
from io import BytesIO
root=Path(__file__).resolve().parents[1]; outdir=root/'assets/manufacturer-images'; outdir.mkdir(exist_ok=True); S=requests.Session(); S.headers.update({'User-Agent':'Mozilla/5.0'})
products={242:{'url':'https://www.frigidaire.com/en/p/kitchen-appliances/wall-ovens/single-wall-ovens/GCWS2438AF','brand':'Frigidaire'},2441:{'url':'https://www.cuisinart.com/electric-knife-set-with-cutting-board/CEK-41.html','brand':'Cuisinart'}}
res={}
for pid,p in products.items():
 r=S.get(p['url'],timeout=45); text=r.text; from bs4 import BeautifulSoup; soup=BeautifulSoup(text,'html.parser'); h=soup.find('h1'); title=h.get_text(' ',strip=True) if h else (soup.title.get_text(' ',strip=True) if soup.title else '')
 urls=[]
 for tag in soup.select('meta[property="og:image"],meta[name="twitter:image"]'):
  if tag.get('content'): urls.append(tag['content'])
 for x in re.findall(r'https?[^"\'<> ]+\.(?:jpg|jpeg|png|webp)(?:\?[^"\'<> ]*)?',text,re.I):
  x=x.replace('\\/','/').replace('\\u0026','&')
  if not any(k in x.lower() for k in ['logo','icon','sprite','nav','pixel','tracking','banner','swatch']): urls.append(x)
 uniq=[]
 for u in urls:
  if u not in uniq: uniq.append(u)
 local=[]
 for i,u in enumerate(uniq[:12]):
  try:
   b=S.get(u,timeout=45).content; im=Image.open(BytesIO(b)); im.verify(); ext='.'+(im.format or 'jpg').lower(); fn=f'{pid}-{i}-{hashlib.sha1(u.encode()).hexdigest()[:12]}{ext}'; (outdir/fn).write_bytes(b); local.append({'path':'assets/manufacturer-images/'+fn,'source_url':u})
  except: pass
 res[pid]={'manufacturer':p['brand'],'manufacturer_url':p['url'],'sourced_name':title[:150],'gallery':local}
(root/'additional-official-gallery-results.json').write_text(json.dumps(res,indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps({k:{'name':v['sourced_name'],'downloaded':len(v['gallery'])} for k,v in res.items()}))
