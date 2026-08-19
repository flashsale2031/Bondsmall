from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
pat=re.compile(r'window\.products\.push\(\.\.\.\[(.*)\]\);\s*$',re.S)
men=[]; women=[]; found=None
for f in sorted((ROOT/'catalog-pages').glob('products-page-*.js')):
 m=pat.search(f.read_text(encoding='utf-8'))
 if not m: raise SystemExit(f'wrapper error: {f.name}')
 for p in json.loads('['+m.group(1)+']'):
  c=str(p.get('category','')).lower()
  if c=='men': men.append(p.get('id'))
  if c=='women': women.append(p.get('id'))
  if p.get('id')==2225: found=p
assert found and found['category']=='women' and found['gender']=='Women'
assert 2225 not in men and 2225 in women
assert found['images']==['assets/mens/page2-main-corrections/2225.webp','assets/main-images/hf-684.webp']
idx=(ROOT/'catalog-category-index.js').read_text(encoding='utf-8')
assert '"men":{"count":237' in idx
assert '"women":{"count":22536' in idx
assert (ROOT/'assets/mens/page2-main-corrections/2225.webp').exists()
assert (ROOT/'assets/main-images/hf-684.webp').exists()
print(json.dumps({'id':2225,'category':'women','men_count':len(men),'women_count':len(women),'main_image':found['images'][0],'secondary_image':found['images'][1],'index_valid':True},indent=2))
