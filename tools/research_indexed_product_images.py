import html, json, re, concurrent.futures, time
from pathlib import Path
from urllib.parse import quote_plus, urlparse
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
CAT=ROOT/'catalog-pages'
PAT=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
PLACE='01RmK+J4pJL._AC_.gif'.lower()
records=[]; seen=set()
for f in sorted(CAT.glob('products-page-*.js')):
    m=PAT.search(f.read_text(encoding='utf-8'))
    if not m: raise RuntimeError(f'bad wrapper {f}')
    recs=json.loads('['+m.group(1)+']')
    if recs and isinstance(recs[0],list): recs=recs[0]
    for p in recs:
        if int(p.get('id',0))<=160: continue
        if PLACE not in str(p.get('image','')).lower(): continue
        src=str(p.get('source_url',''))
        if '/dp/' not in src: continue
        asin=src.split('/dp/',1)[1].split('?',1)[0].strip('/')
        if asin not in seen:
            seen.add(asin); records.append({'id':p.get('id'),'name':str(p.get('name','')),'asin':asin,'source_url':src})
print('unresolved_unique_asins',len(records),flush=True)

session_headers={'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36','Accept-Language':'en-US,en;q=0.9'}

def clean_url(u):
    u=html.unescape(u).replace('\\/','/').strip('"\'<> )];,')
    if u.startswith('//'): u='https:'+u
    return u

def is_image(u):
    x=u.lower()
    if not x.startswith(('http://','https://')): return False
    if any(s in x for s in ['01rmk+j4pjl','transparent','grey-pixel','nav-sprite','logo','favicon','pixel.gif']): return False
    return bool(re.search(r'\.(jpg|jpeg|png|webp)(?:[?#&]|$)',x)) or 'images' in x or 'media' in x

def tokens(s):
    stop={'and','the','for','with','from','this','that','pack','set','amazon','com','new','item','product','pcs'}
    return [x for x in re.findall(r'[a-z0-9]{3,}',s.lower()) if x not in stop]

def score_candidate(img,purl,name,asin):
    text=(img+' '+purl).lower(); ts=tokens(name)
    overlap=sum(1 for t in ts if t in text)
    score=overlap
    if asin.lower() in text: score+=8
    if 'amazon' in text: score+=2
    if any(x in text for x in ['product','dp/','listing','shop']): score+=1
    return score,overlap

def bing(q):
    out=[]
    try:
        r=requests.get('https://www.bing.com/images/search',params={'q':q},headers=session_headers,timeout=30)
        t=html.unescape(r.text)
        ms=re.findall(r'murl["\s]*:["\']([^"\']+)',t)
        ps=re.findall(r'purl["\s]*:["\']([^"\']+)',t)
        for i,img in enumerate(ms[:80]):
            img=clean_url(img); purl=clean_url(ps[i]) if i<len(ps) else ''
            if is_image(img): out.append((img,purl,'bing'))
    except Exception: pass
    return out

def google(q):
    out=[]
    try:
        r=requests.get('https://www.google.com/search',params={'tbm':'isch','q':q},headers=session_headers,timeout=30)
        t=html.unescape(r.text)
        urls=re.findall(r'https?://[^"\\ ]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"\\ ]*)?',t,re.I)
        for img in urls[:100]:
            img=clean_url(img)
            if is_image(img): out.append((img,'','google'))
    except Exception: pass
    return out

def yahoo(q):
    out=[]
    try:
        r=requests.get('https://images.search.yahoo.com/search/images',params={'p':q},headers=session_headers,timeout=30)
        t=html.unescape(r.text)
        # Yahoo embeds image URLs in imgurl=... and sometimes direct JSON fields.
        vals=re.findall(r'(?:imgurl|imageurl|murl)["=:]+([^&"\\ ]+)',t,re.I)
        for img in vals[:100]:
            img=clean_url(img)
            if is_image(img): out.append((img,'','yahoo'))
    except Exception: pass
    return out

def one(rec):
    q=f"{rec['name']} {rec['asin']}"
    cands=bing(q)+google(q)+yahoo(q)
    ranked=[]
    for img,purl,engine in cands:
        sc,over=score_candidate(img,purl,rec['name'],rec['asin'])
        ranked.append({'image_url':img,'source_url':purl,'engine':engine,'score':sc,'token_overlap':over})
    ranked.sort(key=lambda x:(x['score'],x['token_overlap']),reverse=True)
    # Strict acceptance: ASIN-linked result, or at least four title-token matches.
    accepted=None
    for x in ranked:
        txt=(x['image_url']+' '+x['source_url']).lower()
        if rec['asin'].lower() in txt or x['token_overlap']>=4:
            accepted=x; break
    return {'id':rec['id'],'name':rec['name'],'asin':rec['asin'],'source_url':rec['source_url'],'accepted':accepted,'candidates':ranked[:5]}

out=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=24) as ex:
    futures=[ex.submit(one,r) for r in records]
    for i,fu in enumerate(concurrent.futures.as_completed(futures),1):
        try: out.append(fu.result())
        except Exception as e: out.append({'accepted':None,'error':str(e)})
        if i%100==0:
            Path(ROOT/'indexed-image-research.partial.json').write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding='utf-8')
            print('done',i,flush=True)
Path(ROOT/'indexed-image-research.json').write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding='utf-8')
print('accepted',sum(1 for x in out if x.get('accepted')),'unresolved',sum(1 for x in out if not x.get('accepted')),flush=True)
