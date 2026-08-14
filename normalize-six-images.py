from pathlib import Path
import mmap,re,json,shutil
ROOT=Path(__file__).resolve().parent
SRC=ROOT/'products.js'; TMP=ROOT/'products.js.images.tmp'
PAT=re.compile(rb'"images"\s*:\s*\[(.*?)\]',re.S)
URLPAT=re.compile(r'https?://[^"\\]+')
PLACEHOLDER='https://www.bondsmall.com/bonds-mall-logo.png'

def normalize(match):
    body=match.group(1)
    try:
        vals=json.loads('['+body.decode('utf-8')+']')
        if not isinstance(vals,list): return match.group(0)
        vals=[str(v) for v in vals if isinstance(v,str) and v.startswith(('http://','https://'))]
    except Exception:
        vals=URLPAT.findall(body.decode('utf-8','replace'))
    if len(vals)>=6: return match.group(0)
    if not vals: vals=[PLACEHOLDER]
    vals=vals[:6]
    while len(vals)<6: vals.append(vals[-1])
    return b'"images":'+json.dumps(vals,ensure_ascii=False,separators=(',',':')).encode('utf-8')

def main():
    changed=zero=arrays=0
    with SRC.open('rb') as fi, mmap.mmap(fi.fileno(),0,access=mmap.ACCESS_READ) as mm, TMP.open('wb') as fo:
        pos=0
        for m in PAT.finditer(mm):
            arrays+=1
            old=m.group(0); new=normalize(m)
            if new!=old:
                changed+=1
                if b'"'+PLACEHOLDER.encode()+b'"' in new: zero+=1
            fo.write(mm[pos:m.start()]); fo.write(new); pos=m.end()
        fo.write(mm[pos:])
    shutil.move(TMP,SRC)
    print('arrays',arrays,'normalized',changed,'placeholder_records',zero)
if __name__=='__main__': main()
