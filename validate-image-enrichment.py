from pathlib import Path
import mmap,re,json,collections,xml.etree.ElementTree as ET
p=Path(__file__).with_name('products.js'); pat=re.compile(rb'"images":(\[.*?\])')
counts=collections.Counter(); distinct=collections.Counter(); total=0; placeholders=0
with p.open('rb') as f, mmap.mmap(f.fileno(),0,access=mmap.ACCESS_READ) as mm:
 for m in pat.finditer(mm):
  arr=json.loads(m.group(1)); total+=1; counts[len(arr)]+=1; distinct[len(set(arr))]+=1
  if any('bonds-mall-logo.png' in x for x in arr): placeholders+=1
print('records',total,'image_count_distribution',sorted(counts.items()),'distinct_image_distribution',sorted(distinct.items()),'placeholder_records',placeholders)
assert total==1231539 and min(counts)>=6
ET.parse(p.with_name('google-shopping-feed.xml')); ET.parse(p.with_name('sitemap.xml'))
feed=p.with_name('google-shopping-feed.xml').read_text(); print('feed_items',feed.count('<item>'),'xml PASS')
