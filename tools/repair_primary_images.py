import ast, json, re, time
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parents[1]/'catalog-pages'
REPORT=Path(__file__).resolve().parents[1].parent/'primary-image-repair-report.json'
PAT=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$', re.S)
LOGO='bonds-mall-logo.png'
KNOWN_PLACEHOLDER='01RmK+J4pJL._AC_.gif'

session=requests.Session(); session.headers.update({'User-Agent':'Mozilla/5.0 (Bondsmall catalog image verification)'})
hf_cache={}

def norm(u):
    if not isinstance(u,str): return ''
    u=u.strip()
    if u.startswith('//'): return 'https:'+u
    return u

def bad(u):
    x=norm(u).lower()
    return (not x) or LOGO in x or KNOWN_PLACEHOLDER.lower() in x or 'placeholder' in x

def hf_images(offset):
    if offset in hf_cache: return hf_cache[offset]
    try:
        r=session.get('https://datasets-server.huggingface.co/rows',params={'dataset':'UniqueData/asos-e-commerce-dataset','config':'default','split':'train','offset':offset,'length':1},timeout=30)
        r.raise_for_status(); row=r.json().get('rows',[{}])[0].get('row',{})
        raw=row.get('images','')
        imgs=ast.literal_eval(raw) if isinstance(raw,str) else raw
        imgs=[norm(x) for x in (imgs or []) if norm(x)]
    except Exception:
        imgs=[]
    hf_cache[offset]=imgs
    time.sleep(0.05)
    return imgs

report={'files':0,'records':0,'updated':0,'gallery_first_fixed':0,'protocol_normalized':0,'asos_recovered':0,'placeholder_unresolved':0,'missing_unresolved':0,'unresolved_examples':[]}
for f in sorted(ROOT.glob('products-page-*.js')):
    text=f.read_text(encoding='utf-8'); m=PAT.search(text)
    if not m: raise RuntimeError(f'Cannot parse {f}')
    recs=json.loads('['+m.group(1)+']'); changed=False
    for p in recs:
        if int(p.get('id',0))<=160: continue
        report['records']+=1
        original=json.dumps(p,ensure_ascii=False,sort_keys=True)
        source=str(p.get('source_url') or '')
        primary=norm(p.get('image'))
        imgs=[norm(x) for x in (p.get('images') or []) if norm(x)]
        if source.startswith('https://huggingface.co/datasets/UniqueData/asos-e-commerce-dataset') and str(p.get('name','')).startswith('ASOS catalog product '):
            try: offset=int(str(p['name']).rsplit(' ',1)[1])
            except Exception: offset=-1
            if offset>=0:
                recovered=hf_images(offset)
                if recovered:
                    primary=recovered[0]; imgs=recovered; report['asos_recovered']+=1
        if bad(primary):
            candidates=[x for x in imgs if not bad(x)]
            # Amazon placeholder galleries in this catalog are known to contain
            # unrelated cross-record images; never promote those blindly.
            if candidates and not source.startswith('https://www.amazon.com/'):
                primary=candidates[0]
        if primary and not bad(primary):
            # The storefront, popup, and SEO code all need the source-confirmed primary first.
            clean=[]
            for x in [primary]+imgs:
                x=norm(x)
                if x and not bad(x) and x not in clean: clean.append(x)
            p['image']=primary
            p['images']=clean[:10]
            if imgs and imgs[0]!=primary: report['gallery_first_fixed']+=1
        else:
            report['placeholder_unresolved' if primary else 'missing_unresolved']+=1
            if len(report['unresolved_examples'])<100: report['unresolved_examples'].append({'id':p.get('id'),'name':p.get('name'),'source_url':source,'image':primary})
        if json.dumps(p,ensure_ascii=False,sort_keys=True)!=original:
            changed=True; report['updated']+=1
    if changed:
        payload=json.dumps(recs,ensure_ascii=False,separators=(',',':'))
        f.write_text('// Bondsmall page-sized catalog chunk '+f.stem.split('-')[-1].lstrip('0')+'\nwindow.products = window.products || [];\nwindow.products.push(...['+payload+']);\n',encoding='utf-8')
    report['files']+=1
REPORT.write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps(report,indent=2,ensure_ascii=False))
