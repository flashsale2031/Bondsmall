import json, re
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'catalog-pages'
files=sorted(root.glob('products-page-*.js'))
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$', re.S)
count=0; affected=0; arrays=0; mismatch=0; missing=0; url_counts={}; samples=[]; source_missing=0
for f in files:
    text=f.read_text(encoding='utf-8')
    m=pat.search(text)
    if not m: raise RuntimeError(f'bad wrapper {f}')
    recs=json.loads('['+m.group(1)+']')
    for p in recs:
        if int(p.get('id',0)) <= 160: continue
        count += 1
        image=p.get('image')
        imgs=p.get('images')
        if isinstance(image,list): arrays += 1; primary=image[0] if image else None
        else: primary=image
        if not primary: missing += 1
        if isinstance(imgs,list) and imgs and primary != imgs[0]: mismatch += 1
        if primary: url_counts[primary]=url_counts.get(primary,0)+1
        if not p.get('source_url'): source_missing += 1
        if len(samples)<25:
            samples.append({'id':p.get('id'),'name':p.get('name'),'image':image,'images0':imgs[0] if isinstance(imgs,list) and imgs else None,'source_url':p.get('source_url'),'source_catalog':p.get('source_catalog')})
        if primary and url_counts.get(primary,0)>1: affected += 1
print(json.dumps({'records_after_160':count,'image_arrays':arrays,'primary_missing':missing,'image_images0_mismatch':mismatch,'source_url_missing':source_missing,'reused_primary_occurrences_after_first':affected,'top_reused':sorted(url_counts.items(), key=lambda x:x[1], reverse=True)[:20],'samples':samples}, indent=2, ensure_ascii=False))
