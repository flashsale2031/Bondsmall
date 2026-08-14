from __future__ import annotations
import json,re,shutil,subprocess
from pathlib import Path
import ijson
ROOT=Path(__file__).resolve().parent; SRC=ROOT/'products.js'; TMP=ROOT/'products.js.similar.tmp'; PLACE='https://www.bondsmall.com/bonds-mall-logo.png'; TARGET=6
class JsArrayReader:
 def __init__(self,f): self.f=f; self.buf=b''; self.done=False
 def read(self,n=-1):
  if n==0:return b''
  if self.done:return b''
  while True:
   data=self.f.read(n)
   if data:self.buf+=data
   j=self.buf.find(b'];')
   if j>=0:
    out=self.buf[:j+1]; self.buf=b''; self.done=True; return out
   if not data:
    out=self.buf; self.buf=b''; self.done=True; return out
   if len(self.buf)>1:
    out=self.buf[:-1]; self.buf=self.buf[-1:]; return out

def products():
 proc=subprocess.Popen(['bash','-lc',f'tail -c +{len(b"var products = ")+1} "{SRC}" | head -c -2'],stdout=subprocess.PIPE)
 try:
  yield from ijson.items(proc.stdout,'item',use_float=True)
 finally:
  proc.stdout.close(); proc.wait()
def group(p):
 return str(p.get('source_store') or p.get('source_catalog') or p.get('category') or 'general')
def images(p):
 v=p.get('images') or p.get('image') or []
 if isinstance(v,str):v=[v]
 return [str(x) for x in v if isinstance(x,str) and x.startswith(('http://','https://'))]
def main():
 candidates={}; total=0
 for p in products():
  total+=1; g=group(p); arr=candidates.setdefault(g,[])
  for u in images(p):
   if u!=PLACE and u not in arr and len(arr)<80: arr.append(u)
 print('pass1_products',total,'groups',len(candidates))
 seen=0; changed=0; preserved=0; fallback=0
 with TMP.open('w',encoding='utf-8') as out:
  out.write('var products = [\n')
  for p in products():
   seen+=1; old=images(p); primary=old[0] if old else PLACE; g=group(p); result=[primary]
   for u in candidates.get(g,[]):
    if u not in result: result.append(u)
    if len(result)>=TARGET:break
   if len(result)<TARGET:
    for u in candidates.get(str(p.get('category') or 'general'),[]):
     if u not in result: result.append(u)
     if len(result)>=TARGET:break
   while len(result)<TARGET: result.append(primary); fallback+=1
   if result!=old: changed+=1
   if old and old[0]==result[0]: preserved+=1
   p['images']=result
   if seen>1: out.write(',\n')
   out.write(json.dumps(p,ensure_ascii=False,separators=(',',':')))
  out.write('\n];\n')
 assert seen==total
 shutil.move(TMP,SRC)
 print('rewritten_products',seen,'changed',changed,'primary_preserved',preserved,'fallback_entries',fallback)
if __name__=='__main__':main()
