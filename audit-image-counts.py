from pathlib import Path
import mmap,re,collections
p=Path(__file__).with_name('products.js')
pat=re.compile(rb'"images"\s*:\s*\[(.*?)\]',re.S)
urlpat=re.compile(rb'https?://')
counts=collections.Counter(); arrays=0; urls=0
with p.open('rb') as f, mmap.mmap(f.fileno(),0,access=mmap.ACCESS_READ) as mm:
    for m in pat.finditer(mm):
        n=len(urlpat.findall(m.group(1))); counts[n]+=1; arrays+=1; urls+=n
print('image_arrays',arrays,'url_entries',urls,'distribution',sorted(counts.items()))
print('catalog_records',len(re.findall(rb'"id"\s*:\s*\d+',mm)))
