import json,shutil,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]; outdir=root/'assets/pages-10-17-product-mains'; outdir.mkdir(parents=True,exist_ok=True)
manual={245:'/home/ubuntu/upload/search_images/KPy9mVHLfIFO.jpg',267:'/home/ubuntu/upload/search_images/4f0Bpdu4A1Ex.jpg',309:'/home/ubuntu/upload/search_images/KEUFK7y3BoDm.png',315:'/home/ubuntu/upload/search_images/Ek6fkp4xZOEM.jpg',291:'/home/ubuntu/upload/search_images/DIiXbclgvWyd.jpg',210:'/home/ubuntu/upload/search_images/fI5ZxOgN9V6o.jpg'}
r=json.loads((root/'pages-10-17-product-main-results.json').read_text())
for pid,src in manual.items():
 dst=outdir/f'{pid}-manual-indexed.jpg'; shutil.copy2(src,dst); x=r[str(pid)]; x.update({'url':'indexed-image-search','engine':'manual-indexed','score':99,'local':str(dst.relative_to(root)),'manual_source_file':src})
(root/'pages-10-17-product-main-results.json').write_text(json.dumps(r,indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps({'manual_matches':len(manual),'localized':sum(bool(x['local']) for x in r.values()),'unresolved':sum(not x['local'] for x in r.values())}))
